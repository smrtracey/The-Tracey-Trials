import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getMediaUrl } from '../lib/media'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getTimestamp(value) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getMediaItems(submission) {
  if (Array.isArray(submission.mediaItems)) {
    return submission.mediaItems
  }

  if (submission.mediaType && submission.mediaUrl) {
    return [{
      type: submission.mediaType,
      url: submission.mediaUrl,
      originalName: submission.originalName,
    }]
  }

  return []
}

function formatMediaLabel(mediaItems, emptyLabel = 'Text only') {
  const imageCount = mediaItems.filter((item) => item.type === 'image').length
  const videoCount = mediaItems.filter((item) => item.type === 'video').length

  if (imageCount > 0 && videoCount > 0) {
    return `${mediaItems.length} media`
  }

  if (imageCount > 0) {
    return `${imageCount} photo${imageCount === 1 ? '' : 's'}`
  }

  if (videoCount > 0) {
    return `${videoCount} video${videoCount === 1 ? '' : 's'}`
  }

  return emptyLabel
}

function formatGroupSummary(group) {
  const submissionCount = group.submissions.length
  const mediaLabel = formatMediaLabel(group.mediaItems)
  const submissionLabel = `${submissionCount} submission${submissionCount === 1 ? '' : 's'}`

  return `${mediaLabel} · ${submissionLabel}`
}

function MediaPreview({ mediaItem }) {
  const mediaUrl = getMediaUrl(mediaItem.url)

  if (mediaItem.type === 'video') {
    return (
      <span className="submission-task-preview-media submission-task-preview-media--video">
        <video src={mediaUrl} muted playsInline preload="metadata" aria-hidden="true" />
        <span className="submission-task-preview-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    )
  }

  return (
    <span className="submission-task-preview-media">
      <img src={mediaUrl} alt="" loading="lazy" />
    </span>
  )
}

function TaskPreviewStack({ group }) {
  const previewItems = group.mediaItems.slice(0, 2)
  const remainingCount = Math.max(0, group.mediaItems.length - previewItems.length)

  if (previewItems.length === 0) {
    return (
      <span className="submission-task-preview submission-task-preview--text" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M14 3v5h5M9 12h7M9 16h7" />
        </svg>
      </span>
    )
  }

  return (
    <span className="submission-task-preview" aria-hidden="true">
      {previewItems.map((mediaItem, index) => (
        <MediaPreview
          key={`${mediaItem.url}-${index}`}
          mediaItem={mediaItem}
        />
      ))}
      {remainingCount > 0 ? (
        <span className="submission-task-preview-count">+{remainingCount}</span>
      ) : null}
    </span>
  )
}

function SubmissionMedia({ mediaItem, submission, mediaIndex }) {
  const mediaUrl = getMediaUrl(mediaItem.url)
  const fileName = mediaItem.originalName || `submission-media-${mediaIndex + 1}`

  if (mediaItem.type === 'video') {
    return (
      <div className="submission-gallery-media submission-gallery-media--video">
        <video
          src={mediaUrl}
          controls
          playsInline
          preload="metadata"
          aria-label={fileName}
        />
      </div>
    )
  }

  return (
    <a
      className="submission-gallery-media"
      href={mediaUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${fileName} in a new tab`}
    >
      <img
        src={mediaUrl}
        alt={submission.caption || fileName || 'Task submission image'}
        loading="lazy"
      />
    </a>
  )
}

function SubmissionGallerySheet({ group, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div className="submission-gallery-backdrop" role="presentation" onClick={onClose}>
      <section
        className="submission-gallery-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-gallery-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="submission-gallery-handle" aria-hidden="true" />
        <header className="submission-gallery-header">
          <div>
            <p className="submission-gallery-eyebrow">My submissions</p>
            <h3 id="submission-gallery-title">{group.taskName}</h3>
            <p className="submission-gallery-summary">{formatGroupSummary(group)}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="submission-gallery-close"
            onClick={onClose}
            aria-label="Close submission gallery"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="submission-gallery-content">
          {group.submissions.map((submission) => {
            const mediaItems = getMediaItems(submission)
            const caption = submission.caption?.trim()
            const textBody = submission.textBody?.trim()

            return (
              <article className="submission-gallery-entry" key={submission.id}>
                <div className="submission-gallery-entry-meta">
                  <span>{formatDate(submission.createdAt)}</span>
                  <span>
                    {mediaItems.length > 0
                      ? formatMediaLabel(mediaItems)
                      : 'Text submission'}
                  </span>
                </div>

                {caption ? <p className="submission-gallery-caption">{caption}</p> : null}
                {textBody ? <p className="submission-gallery-text">{textBody}</p> : null}

                {mediaItems.length > 0 ? (
                  <div className="submission-gallery-media-grid">
                    {mediaItems.map((mediaItem, mediaIndex) => (
                      <SubmissionMedia
                        key={`${submission.id}-${mediaItem.url}-${mediaIndex}`}
                        mediaItem={mediaItem}
                        submission={submission}
                        mediaIndex={mediaIndex}
                      />
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    </div>,
    document.body,
  )
}

function SubmissionList({ submissions, getTaskName }) {
  const [selectedTaskNumber, setSelectedTaskNumber] = useState(null)
  const groupedSubmissions = useMemo(() => {
    const groups = new Map()

    for (const submission of submissions) {
      const existingGroup = groups.get(submission.taskNumber)
      const mediaItems = getMediaItems(submission)

      if (existingGroup) {
        existingGroup.submissions.push(submission)
        existingGroup.mediaItems.push(...mediaItems)
        existingGroup.latestTimestamp = Math.max(
          existingGroup.latestTimestamp,
          getTimestamp(submission.createdAt),
        )
        continue
      }

      groups.set(submission.taskNumber, {
        taskNumber: submission.taskNumber,
        taskName: getTaskName(submission.taskNumber),
        submissions: [submission],
        mediaItems: [...mediaItems],
        latestTimestamp: getTimestamp(submission.createdAt),
      })
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        submissions: [...group.submissions].sort(
          (first, second) => getTimestamp(second.createdAt) - getTimestamp(first.createdAt),
        ),
      }))
      .sort((first, second) => second.latestTimestamp - first.latestTimestamp)
  }, [getTaskName, submissions])
  const selectedGroup = groupedSubmissions.find(
    (group) => group.taskNumber === selectedTaskNumber,
  )

  if (!submissions.length) {
    return (
      <div className="empty-state">
        <h3>No tasks submitted yet</h3>
        <p>Your first task submission will appear here once the backend saves it.</p>
      </div>
    )
  }

  return (
    <>
      <div className="submission-task-list">
        {groupedSubmissions.map((group) => (
          <button
            type="button"
            className="submission-task-row"
            key={group.taskNumber}
            onClick={() => setSelectedTaskNumber(group.taskNumber)}
            aria-haspopup="dialog"
          >
            <TaskPreviewStack group={group} />
            <span className="submission-task-row-copy">
              <strong>{group.taskName}</strong>
              <span>{formatGroupSummary(group)}</span>
              <time dateTime={new Date(group.latestTimestamp).toISOString()}>
                Updated {formatDate(group.latestTimestamp)}
              </time>
            </span>
            <svg
              className="submission-task-row-chevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      {selectedGroup ? (
        <SubmissionGallerySheet
          group={selectedGroup}
          onClose={() => setSelectedTaskNumber(null)}
        />
      ) : null}
    </>
  )
}

export default SubmissionList
