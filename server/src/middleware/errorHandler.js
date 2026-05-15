import multer from 'multer'
import { env } from '../config/env.js'

export function notFoundHandler(_request, response) {
  response.status(404).json({ message: 'Route not found.' })
}

export function errorHandler(error, _request, response, _next) {
  void _next
  console.error(error)

  if (error?.uploadContext) {
    console.error('Upload failure details:', error.uploadContext)
  }

  if (response.headersSent) {
    return
  }

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({
      message: `Uploaded files must be smaller than ${env.submissionUploadLimitMb} MB each. Phone videos should usually be fine, but large GoPro or action-camera videos should be compressed or exported before uploading.`,
    })
  }

  response.status(error.statusCode ?? 500).json({
    message: error.message ?? 'Unexpected server error.',
  })
}
