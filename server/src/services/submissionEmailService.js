import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let cachedTransporter = null

function hasMailConfiguration() {
  return Boolean(
    env.submissionEmailTo &&
      env.smtpHost &&
      env.smtpPort &&
      env.smtpUser &&
      env.smtpPass &&
      env.smtpFrom,
  )
}

function getTransporter() {
  if (!hasMailConfiguration()) {
    return null
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    })
  }

  return cachedTransporter
}

function buildMediaLines(submission) {
  const mediaItems = Array.isArray(submission.mediaItems) ? submission.mediaItems : []

  if (mediaItems.length === 0) {
    return ['Media: none']
  }

  return [
    'Media:',
    ...mediaItems.map((mediaItem, index) => {
      const label = mediaItem.originalName || `File ${index + 1}`
      return `- ${label}: ${mediaItem.url}`
    }),
  ]
}

function formatSubmittedAtForIreland(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const formatter = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))

  return `${values.hour}:${values.minute}:${values.second} ${values.day}-${values.month}-${values.year}`
}

export async function sendSubmissionEmail({ submission, user, task }) {
  const transporter = getTransporter()

  if (!transporter) {
    return { sent: false, skipped: true, reason: 'Email settings are not configured.' }
  }

  const taskLabel = task?.title ? `${submission.taskNumber} - ${task.title}` : String(submission.taskNumber)
  const contestantLabel = `${user.displayName} (@${user.username})`
  const textBody = submission.textBody || '(none)'
  const mediaLines = buildMediaLines(submission)

  await transporter.sendMail({
    from: env.smtpFrom,
    to: env.submissionEmailTo,
    subject: `New submission: ${contestantLabel} | Task ${taskLabel}`,
    text: [
      'A new Tracey Trials submission was received.',
      '',
      `Contestant: ${contestantLabel}`,
      `Task: ${taskLabel}`,
      `Submitted At: ${formatSubmittedAtForIreland(submission.createdAt)} (Irish time)`,
      '',
      'Text:',
      textBody,
      '',
      ...mediaLines,
    ].join('\n'),
  })

  return { sent: true, skipped: false }
}
