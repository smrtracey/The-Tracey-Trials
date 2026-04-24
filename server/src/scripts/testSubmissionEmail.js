import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config()

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function main() {
  const host = requiredEnv('SMTP_HOST')
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === 'true'
  const user = requiredEnv('SMTP_USER')
  const pass = requiredEnv('SMTP_PASS')
  const from = requiredEnv('SMTP_FROM')
  const to = requiredEnv('SUBMISSION_EMAIL_TO')

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  })

  console.log('Checking SMTP connection...')
  await transporter.verify()
  console.log('SMTP verify succeeded.')

  const result = await transporter.sendMail({
    from,
    to,
    subject: 'Tracey Trials SMTP test',
    text: 'This is a test email from The Tracey Trials submission notifier setup.',
  })

  console.log('Email send succeeded.')
  console.log(`Message ID: ${result.messageId}`)
}

main().catch((error) => {
  console.error('SMTP test failed.')
  console.error(error.message)
  process.exitCode = 1
})
