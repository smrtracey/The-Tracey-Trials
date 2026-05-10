import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'

let isConfigured = false

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

export async function uploadSubmissionFiles(files) {
  ensureCloudinaryConfigured()

  const uploadedFiles = Array.isArray(files) ? files : []
  if (uploadedFiles.length === 0) {
    return []
  }

  const results = []

  for (const file of uploadedFiles) {
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: env.cloudinaryUploadFolder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      filename_override: file.originalname,
    })

    results.push({
      url: uploadResult.secure_url,
      type: uploadResult.resource_type === 'video' ? 'video' : 'image',
      originalName: file.originalname,
      publicId: uploadResult.public_id,
    })
  }

  return results
}