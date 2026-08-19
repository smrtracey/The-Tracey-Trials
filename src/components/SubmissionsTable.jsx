import React, { useState, useMemo } from 'react';

function truncateTextPreview(value, maxLength = 15) {
  if (!value) {
    return '';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export default function SubmissionsTable({
  submissionRows,
  newSubmissionCount,
  isLoading,
  isMarkingAllFinished,
  markAllError,
  navigate,
  onMarkAllFinished,
  setActiveSubmissionId
}) {
  const [showDoneSubmissions, setShowDoneSubmissions] = useState(false);
  // Removed sorting state and logic
  // Filter submissions based on showDoneSubmissions
  const filteredRows = useMemo(() => {
    return submissionRows.filter(sub => showDoneSubmissions ? sub.done : !sub.done);
  }, [submissionRows, showDoneSubmissions]);

  return (
    <article className="task-meta-card judge-dashboard-card submissions-card">
      <div className="judge-section-header submissions-card-header">
        <h2 style={{ margin: 0 }}>
          {showDoneSubmissions ? 'Finished Submissions' : 'New Submissions'}{' '}
          <span style={{ color: 'var(--text-soft)', fontWeight: 500 }}>({filteredRows.length})</span>
        </h2>
        <div className="submissions-card-actions">
          {!showDoneSubmissions ? (
            <button
              className="button-secondary submissions-card-action"
              type="button"
              onClick={onMarkAllFinished}
              disabled={isLoading || isMarkingAllFinished || newSubmissionCount === 0}
            >
              {isMarkingAllFinished ? 'Marking…' : 'Mark all as finished'}
            </button>
          ) : null}
          <button
            className="button-ghost submissions-card-action"
            type="button"
            onClick={() => setShowDoneSubmissions((v) => !v)}
          >
            {showDoneSubmissions ? 'Show New' : 'Show Finished'}
          </button>
        </div>
      </div>
      {markAllError ? <div className="error-banner">{markAllError}</div> : null}
      {isLoading ? <p className="muted">Loading submissions...</p> : null}
      {!isLoading ? (
        <div className="judge-table-wrap">
          {filteredRows.length === 0 ? (
            <p className="muted">No submissions found.</p>
          ) : (
            <table className="judge-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Submitted</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Contestant</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Task</th>
                  <th>Media</th>
                  <th>Text</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((submission) => (
                  <tr
                    key={submission.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActiveSubmissionId(submission.id)}
                  >
                    <td>{submission.createdAt}</td>
                    <td>
                      <button
                        type="button"
                        className="judge-link-button"
                        onClick={e => { e.stopPropagation(); navigate(`/judge/player/${submission.username}`); }}
                      >
                        {submission.displayName}
                      </button>
                    </td>
                    <td>{submission.taskLabel}</td>
                    <td>{submission.hasMedia}</td>
                    <td title={submission.textBody || ''}>{truncateTextPreview(submission.textBody)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </article>
  );
}
