import path from 'path'
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

function buildAttachmentList(uploadedFiles) {
  const normalizedFiles = Array.isArray(uploadedFiles)
    ? uploadedFiles
    : uploadedFiles?.path
      ? [uploadedFiles]
      : []

  if (normalizedFiles.length === 0) {
    return []
  }

  return normalizedFiles.map((uploadedFile) => ({
    filename: uploadedFile.originalname || path.basename(uploadedFile.path),
    path: uploadedFile.path,
    contentType: uploadedFile.mimetype,
  }))
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

export async function sendSubmissionEmail({ submission, user, task, uploadedFiles }) {
  const transporter = getTransporter()

  if (!transporter) {
    return { sent: false, skipped: true, reason: 'Email settings are not configured.' }
  }

  const attachments = buildAttachmentList(uploadedFiles)
  const taskLabel = task?.title ? `${submission.taskNumber} - ${task.title}` : String(submission.taskNumber)
  const contestantLabel = `${user.displayName} (@${user.username})`
  const textBody = submission.textBody || '(none)'

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
      attachments.length > 0
        ? `Media attachments: ${attachments.map((attachment) => attachment.filename).join(', ')}`
        : 'Media attachments: none',
    ].join('\n'),
    attachments,
  })

  return { sent: true, skipped: false }
}
