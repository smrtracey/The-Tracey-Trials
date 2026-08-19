import { randomUUID } from 'crypto'
import { createReadStream } from 'fs'
import path from 'path'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env.js'

const MIN_SIGNED_URL_TTL_SECONDS = 1
const MAX_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60
const MULTIPART_PART_SIZE_BYTES = 10 * 1024 * 1024

let r2Client

function createConfigurationError() {
  const error = new Error('Media storage is not configured. Please contact the administrator.')
  error.statusCode = 503
  return error
}

function getR2Client() {
  if (r2Client) {
    return r2Client
  }

  if (
    !env.r2AccountId
    || !env.r2AccessKeyId
    || !env.r2SecretAccessKey
    || !env.r2BucketName
  ) {
    throw createConfigurationError()
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  })

  return r2Client
}

function normalizeKeyPrefix(value) {
  return String(value ?? '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')
}

function buildObjectKey(file, { userId, taskNumber }) {
  const extension = path.extname(file.originalname ?? '').toLowerCase().replace(/[^a-z0-9.]/g, '')
  const prefix = normalizeKeyPrefix(env.r2KeyPrefix)
  const date = new Date().toISOString().slice(0, 10)
  const segments = [
    prefix,
    String(userId),
    `task-${taskNumber}`,
    date,
    `${randomUUID()}${extension}`,
  ].filter(Boolean)

  return segments.join('/')
}

function getMediaType(file) {
  return file.mimetype.startsWith('video/') ? 'video' : 'image'
}

async function uploadSubmissionFile(file, context) {
  const storageKey = buildObjectKey(file, context)
  const uploader = new Upload({
    client: getR2Client(),
    params: {
      Bucket: env.r2BucketName,
      Key: storageKey,
      Body: createReadStream(file.path),
      ContentType: file.mimetype,
    },
    queueSize: 2,
    partSize: MULTIPART_PART_SIZE_BYTES,
    leavePartsOnError: false,
  })

  await uploader.done()

  return {
    storageKey,
    url: '',
    type: getMediaType(file),
    originalName: file.originalname ?? '',
  }
}

export async function deleteSubmissionMediaItems(mediaItems) {
  const storageKeys = (Array.isArray(mediaItems) ? mediaItems : [])
    .map((item) => item?.storageKey)
    .filter(Boolean)

  if (storageKeys.length === 0) {
    return
  }

  await getR2Client().send(
    new DeleteObjectsCommand({
      Bucket: env.r2BucketName,
      Delete: {
        Objects: storageKeys.map((Key) => ({ Key })),
        Quiet: true,
      },
    }),
  )
}

export async function uploadSubmissionFiles(files, context) {
  const uploadedFiles = Array.isArray(files) ? files : []
  if (uploadedFiles.length === 0) {
    return []
  }

  const mediaItems = []

  try {
    for (const file of uploadedFiles) {
      mediaItems.push(await uploadSubmissionFile(file, context))
    }

    return mediaItems
  } catch (error) {
    try {
      await deleteSubmissionMediaItems(mediaItems)
    } catch (cleanupError) {
      console.error('Could not clean up partially uploaded R2 objects.', cleanupError)
    }

    error.statusCode ??= 502
    error.uploadContext = {
      stage: 'r2-upload',
      uploadedObjectCount: mediaItems.length,
      fileCount: uploadedFiles.length,
    }
    throw error
  }
}

export async function resolveSubmissionMediaUrl(mediaItem) {
  if (!mediaItem?.storageKey) {
    return mediaItem?.url ?? ''
  }

  const requestedTtl = Number(env.r2SignedUrlTtlSeconds)
  const expiresIn = Math.min(
    MAX_SIGNED_URL_TTL_SECONDS,
    Math.max(MIN_SIGNED_URL_TTL_SECONDS, Number.isFinite(requestedTtl) ? requestedTtl : 3600),
  )

  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: env.r2BucketName,
      Key: mediaItem.storageKey,
      ResponseContentDisposition: 'inline',
    }),
    { expiresIn },
  )
}
