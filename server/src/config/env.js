import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/tracey-trials',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  submissionUploadLimitMb: Number(process.env.SUBMISSION_UPLOAD_LIMIT_MB ?? 2048),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  cloudinaryUploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'tracey-trials-submissions',
  longGameDateOverride: process.env.LONG_GAME_DATE_OVERRIDE ?? '',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
}
