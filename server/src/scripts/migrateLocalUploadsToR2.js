import fs from 'fs/promises'
import path from 'path'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import { Submission } from '../models/Submission.js'
import {
  deleteSubmissionMediaItems,
  uploadSubmissionFiles,
} from '../services/r2Service.js'

const legacyUploadDirectory = path.resolve('server/uploads')

const MIME_TYPES_BY_EXTENSION = {
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
}

function getStoredMediaItems(submission) {
  if (Array.isArray(submission.mediaItems) && submission.mediaItems.length > 0) {
    return submission.mediaItems.map((item) => ({
      storageKey: item.storageKey ?? '',
      url: item.url ?? '',
      type: item.type,
      originalName: item.originalName ?? '',
    }))
  }

  if (submission.mediaUrl && submission.mediaType) {
    return [{
      storageKey: '',
      url: submission.mediaUrl,
      type: submission.mediaType,
      originalName: submission.originalName ?? '',
    }]
  }

  return []
}

function getLegacyFilePath(url) {
  if (!url?.startsWith('/uploads/')) {
    return null
  }

  const fileName = path.basename(decodeURIComponent(url))
  const filePath = path.resolve(legacyUploadDirectory, fileName)
  const relativePath = path.relative(legacyUploadDirectory, filePath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null
  }

  return filePath
}

async function migrateSubmission(submission) {
  const storedMediaItems = getStoredMediaItems(submission)
  const newlyUploadedItems = []
  let migratedCount = 0

  try {
    const nextMediaItems = []

    for (const mediaItem of storedMediaItems) {
      const legacyFilePath = getLegacyFilePath(mediaItem.url)

      if (!legacyFilePath || mediaItem.storageKey) {
        nextMediaItems.push(mediaItem)
        continue
      }

      try {
        const fileStats = await fs.stat(legacyFilePath)
        const originalName = mediaItem.originalName || path.basename(legacyFilePath)
        const extension = path.extname(originalName).toLowerCase()
        const [uploadedItem] = await uploadSubmissionFiles(
          [{
            path: legacyFilePath,
            originalname: originalName,
            mimetype: MIME_TYPES_BY_EXTENSION[extension] ?? (
              mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg'
            ),
            size: fileStats.size,
          }],
          {
            userId: submission.user,
            taskNumber: submission.taskNumber,
          },
        )

        newlyUploadedItems.push(uploadedItem)
        nextMediaItems.push(uploadedItem)
        migratedCount += 1
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(`Missing legacy file for submission ${submission._id}: ${mediaItem.url}`)
          nextMediaItems.push(mediaItem)
          continue
        }

        throw error
      }
    }

    if (migratedCount > 0) {
      submission.mediaItems = nextMediaItems
      submission.mediaUrl = null
      submission.mediaType = nextMediaItems[0]?.type ?? null
      submission.originalName = nextMediaItems[0]?.originalName ?? null
      await submission.save()
    }

    return migratedCount
  } catch (error) {
    await deleteSubmissionMediaItems(newlyUploadedItems)
    throw error
  }
}

async function main() {
  await connectDatabase()

  const submissions = await Submission.find({
    $or: [
      { 'mediaItems.url': /^\/uploads\// },
      { mediaUrl: /^\/uploads\// },
    ],
  })

  let migratedFileCount = 0

  for (const submission of submissions) {
    migratedFileCount += await migrateSubmission(submission)
  }

  console.log(`Migrated ${migratedFileCount} legacy media file(s) across ${submissions.length} submission(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
