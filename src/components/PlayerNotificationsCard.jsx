function formatNotificationDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function PlayerNotificationsCard({
  notifications,
  isLoading,
  error,
  onDelete,
  onClearAll,
  deletingNotificationId,
  isClearingAll,
  sectionRef,
}) {
  return (
    <section className="panel player-notifications-card" ref={sectionRef} aria-label="Notifications inbox">
      <div className="player-notifications-header">
        <div>
          <h2>Notifications</h2>
        </div>
        {notifications.length > 0 ? (
          <button
            className="button-ghost player-notification-delete-all"
            type="button"
            onClick={onClearAll}
            disabled={isLoading || isClearingAll}
            aria-label="Clear all notifications"
            title="Clear all notifications"
          >
            {isClearingAll ? 'Clearing…' : 'Clear all'}
          </button>
        ) : null}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {isLoading ? <p className="muted">Loading notifications…</p> : null}

      {!isLoading && notifications.length === 0 ? (
        <p className="muted">No notifications yet.</p>
      ) : null}

      {!isLoading && notifications.length > 0 ? (
        <div className="player-notification-list">
          {notifications.map((notification) => (
            <article key={notification.id} className="player-notification-item">
              <div className="player-notification-copy">
                <div className="player-notification-meta">
                  <strong>{notification.title}</strong>
                  {formatNotificationDate(notification.createdAt) ? (
                    <span>{formatNotificationDate(notification.createdAt)}</span>
                  ) : null}
                </div>
                <p>{notification.body}</p>
              </div>
              <button
                className="button-ghost player-notification-delete"
                type="button"
                onClick={() => onDelete(notification.id)}
                disabled={isClearingAll || deletingNotificationId === notification.id}
                aria-label="Delete notification"
                title="Delete notification"
                style={{ color: '#dc2626' }}
              >
                {deletingNotificationId === notification.id ? (
                  'Deleting…'
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    width="18"
                    height="18"
                    style={{ verticalAlign: 'middle' }}
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M7.5 3.5A1.5 1.5 0 0 1 9 2h2a1.5 1.5 0 0 1 1.5 1.5V4H16a1 1 0 1 1 0 2h-1v10A2 2 0 0 1 13 18H7a2 2 0 0 1-2-2V6H4a1 1 0 1 1 0-2h3.5v-.5ZM7 6v10h6V6H7Zm2 2a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V8Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}