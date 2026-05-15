import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'

let isConfigured = false
const VIDEO_UPLOAD_CHUNK_SIZE_BYTES = 20 * 1024 * 1024

function ensureCloudinaryConfigured() {
  if (isConfigured) {
    return
  }

  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.')
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  })

  isConfigured = true
}

function buildUploadOptions(file) {
  return {
    folder: env.cloudinaryUploadFolder,
    use_filename: true,
    unique_filename: true,
    filename_override: file.originalname,
  }
}

function buildOptimizedVideoUrl(publicId) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    transformation: [
      {
        fetch_format: 'auto',
        quality: 'auto:good',
        video_codec: 'auto',
      },
    ],
  })
}

async function uploadSubmissionFile(file) {
  const isVideo = file.mimetype.startsWith('video/')
  const uploadOptions = buildUploadOptions(file)

  const uploadResult = isVideo
    ? await cloudinary.uploader.upload_large(file.path, {
        ...uploadOptions,
        resource_type: 'video',
        chunk_size: VIDEO_UPLOAD_CHUNK_SIZE_BYTES,
      })
    : await cloudinary.uploader.upload(file.path, {
        ...uploadOptions,
        resource_type: 'image',
      })

  return {
    url: isVideo ? buildOptimizedVideoUrl(uploadResult.public_id) : uploadResult.secure_url,
    type: isVideo ? 'video' : 'image',
    originalName: file.originalname,
    publicId: uploadResult.public_id,
  }
}

export async function uploadSubmissionFiles(files) {
  ensureCloudinaryConfigured()

  const uploadedFiles = Array.isArray(files) ? files : []
  if (uploadedFiles.length === 0) {
    return []
  }

  const results = []

  for (const file of uploadedFiles) {
    results.push(await uploadSubmissionFile(file))
  }

  return results
}