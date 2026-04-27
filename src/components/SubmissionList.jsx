function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function SubmissionList({ submissions }) {
  if (!submissions.length) {
    return (
      <div className="panel">
        <div className="empty-state">
          <h3>No tasks submitted yet</h3>
          <p>Your first task submission will appear here once the backend saves it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="submissions-grid">
      {submissions.map((submission) => (
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
              <h3>{submission.displayName}</h3>
              <p className="meta-text">{formatDate(submission.createdAt)}</p>
            </div>
            <span className="pill">Task #{submission.taskNumber}</span>
          </header>

          {submission.textBody ? <p className="submission-text">{submission.textBody}</p> : null}

          {!(submission.mediaItems?.length > 0) && !submission.textBody ? (
            <p className="meta-text">No media or text body provided.</p>
          ) : null}

          <p className="meta-text">Submitted by #{submission.contestantNumber}</p>
        </article>
      ))}
    </div>
  )
}

export default SubmissionList
