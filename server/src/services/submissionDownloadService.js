import path from 'node:path'

const EXTENSION_BY_CONTENT_TYPE = new Map([
  ['image/gif', '.gif'],
  ['image/heic', '.heic'],
  ['image/heif', '.heif'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['video/mp4', '.mp4'],
  ['video/quicktime', '.mov'],
  ['video/webm', '.webm'],
])

function sanitizeFileNameSegment(value, fallback) {
  const withoutControlCharacters = [...String(value ?? '')]
    .filter((character) => character.codePointAt(0) >= 32)
    .join('')
  const sanitized = withoutControlCharacters
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/[. ]+$/g, '')

  return sanitized || fallback
}

function getMediaItemCount(submission) {
  if (Array.isArray(submission.mediaItems) && submission.mediaItems.length > 0) {
    return submission.mediaItems.length
  }

  return submission.mediaUrl && submission.mediaType ? 1 : 0
}

export function getSubmissionMediaSequenceNumber(submissions, submissionId, mediaIndex) {
  let priorMediaCount = 0

  for (const submission of submissions) {
    const mediaItemCount = getMediaItemCount(submission)
    const currentId = String(submission._id ?? submission.id ?? '')

    if (currentId === String(submissionId)) {
      if (!Number.isInteger(mediaIndex) || mediaIndex < 0 || mediaIndex >= mediaItemCount) {
        throw new RangeError('Submission media index is out of range.')
      }

      return priorMediaCount + mediaIndex + 1
    }

    priorMediaCount += mediaItemCount
  }

  throw new Error('Submission was not found in its player and task sequence.')
}

export function buildSubmissionDownloadFileName({
  playerName,
  taskName,
  sequenceNumber,
  originalName,
  contentType,
}) {
  const originalExtension = path.extname(originalName ?? '')
  const normalizedContentType = String(contentType ?? '').split(';', 1)[0].trim().toLowerCase()
  const extension = originalExtension || EXTENSION_BY_CONTENT_TYPE.get(normalizedContentType) || ''
  const playerSegment = sanitizeFileNameSegment(playerName, 'Player')
  const taskSegment = sanitizeFileNameSegment(taskName, 'Task')

  return `${playerSegment}_${taskSegment}_${sequenceNumber}${extension}`
}

export function buildSubmissionArchiveFileName(playerName, label) {
  const playerSegment = sanitizeFileNameSegment(playerName, 'Player')
  const labelSegment = sanitizeFileNameSegment(label, 'Submissions')

  return `${playerSegment}_${labelSegment}.zip`
}
