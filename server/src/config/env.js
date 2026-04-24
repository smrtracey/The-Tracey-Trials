import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/tracey-trials',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  submissionEmailTo: process.env.SUBMISSION_EMAIL_TO ?? '',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM ?? '',
  longGameDateOverride: process.env.LONG_GAME_DATE_OVERRIDE ?? '',
}
