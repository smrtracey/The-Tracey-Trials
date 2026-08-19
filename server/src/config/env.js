import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/tracey-trials',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  submissionUploadLimitMb: Number(process.env.SUBMISSION_UPLOAD_LIMIT_MB ?? 2048),
  r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2BucketName: process.env.R2_BUCKET_NAME ?? '',
  r2KeyPrefix: process.env.R2_KEY_PREFIX ?? 'submissions',
  r2SignedUrlTtlSeconds: Number(process.env.R2_SIGNED_URL_TTL_SECONDS ?? 3600),
  longGameDateOverride: process.env.LONG_GAME_DATE_OVERRIDE ?? '',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
}
