import path from 'path'

function buildLocalMediaItem(file) {
  const isVideo = file.mimetype.startsWith('video/')
  const fileName = file.filename ?? path.basename(file.path ?? '')
  const url = fileName ? `/uploads/${fileName}` : ''
  const type = isVideo ? 'video' : 'image'
  const originalName = file.originalname ?? ''

  if (!url || !type) {
    const error = new Error(`Upload failed for ${originalName || 'media file'}. Please try again.`)
    error.statusCode = 500
    error.uploadContext = {
      stage: 'local-file-mapping',
      fileName: originalName,
      storedFileName: fileName,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path ?? null,
    }
    throw error
  }

  return {
    url,
    type,
    originalName,
  }
}

export async function uploadSubmissionFiles(files) {
  const uploadedFiles = Array.isArray(files) ? files : []
  if (uploadedFiles.length === 0) {
    return []
  }

  return uploadedFiles.map(buildLocalMediaItem)
}