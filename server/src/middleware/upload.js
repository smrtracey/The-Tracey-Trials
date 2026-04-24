import fs from 'fs'
import path from 'path'
import multer from 'multer'

const uploadDirectory = path.resolve('server/uploads')
fs.mkdirSync(uploadDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, uploadDirectory)
  },
  filename: (_request, file, callback) => {
    const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase()
    callback(null, `${Date.now()}-${safeName}`)
  },
})

function imageFileFilter(_request, file, callback) {
  const isImage = file.mimetype.startsWith('image/')
  const isVideo = file.mimetype.startsWith('video/')

  if (!isImage && !isVideo) {
    callback(new Error('Only image or video uploads are allowed.'))
    return
  }

  callback(null, true)
}

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})
