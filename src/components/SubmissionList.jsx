import { useMemo, useState } from 'react'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function SubmissionList({ submissions, getTaskName }) {
  const groupedSubmissions = useMemo(() => {
    const groups = new Map()

    for (const submission of submissions) {
      const taskName = getTaskName(submission.taskNumber)
      const existingGroup = groups.get(submission.taskNumber)

      if (existingGroup) {
        existingGroup.submissions.push(submission)
        continue
      }

      groups.set(submission.taskNumber, {
        taskNumber: submission.taskNumber,
        taskName,
        submissions: [submission],
      })
    }

    return Array.from(groups.values())
  }, [getTaskName, submissions])
  const [expandedTaskNumbers, setExpandedTaskNumbers] = useState([])

  if (!submissions.length) {
    return (
      <div className="empty-state">
        <h3>No tasks submitted yet</h3>
        <p>Your first task submission will appear here once the backend saves it.</p>
      </div>
    )
  }

  function toggleTaskGroup(taskNumber) {
    setExpandedTaskNumbers((current) =>
      current.includes(taskNumber)
        ? current.filter((value) => value !== taskNumber)
        : [...current, taskNumber],
    )
  }

  return (
    <div className="submission-group-list">
      {groupedSubmissions.map((group) => {
        const isExpanded = expandedTaskNumbers.includes(group.taskNumber)

        return (
          <article className="submission-group-card" key={group.taskNumber}>
            <button
              type="button"
              className="submission-group-toggle"
              onClick={() => toggleTaskGroup(group.taskNumber)}
              aria-expanded={isExpanded}
            >
              <span className="submission-group-heading">
                <strong>{group.taskName}</strong>
                <span className="meta-text">
                  {group.submissions.length} submission{group.submissions.length === 1 ? '' : 's'}
                </span>
              </span>
              <span className="submission-group-chevron" aria-hidden="true">
                {isExpanded ? '−' : '+'}
              </span>
            </button>

            {isExpanded ? (
              <div className="submissions-grid">
                {group.submissions.map((submission) => (
                  <article className="submission-card" key={submission.id}>
                    {(submission.mediaItems ?? []).map((mediaItem, index) =>
                      mediaItem.type === 'image' ? (
                        <img
                          key={`${submission.id}-image-${index}`}
                          src={mediaItem.url}
                          alt={submission.caption || 'Task submission image'}
                        />
                      ) : (
                        <video
                          key={`${submission.id}-video-${index}`}
                          className="submission-media"
                          src={mediaItem.url}
                          controls
                          preload="metadata"
                        />
                      ),
                    )}

                    <header>
                      <div>
                        <h3>Submitted</h3>
                        <p className="meta-text">{formatDate(submission.createdAt)}</p>
                      </div>
                    </header>

                    {submission.textBody ? <p className="submission-text">{submission.textBody}</p> : null}

                    {!(submission.mediaItems?.length > 0) && !submission.textBody ? (
                      <p className="meta-text">No media or text body provided.</p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

export default SubmissionList
