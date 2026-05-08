import React, { useState, useMemo } from 'react';

export default function SubmissionsTable({
  submissionRows,
  isLoading,
  navigate,
  setActiveSubmissionId
}) {
  const [showDoneSubmissions, setShowDoneSubmissions] = useState(false);
  // Removed sorting state and logic
  // Filter submissions based on showDoneSubmissions
  const filteredRows = useMemo(() => {
    return submissionRows.filter(sub => showDoneSubmissions ? sub.done : !sub.done);
  }, [submissionRows, showDoneSubmissions]);

  return (
    <article className="task-meta-card judge-dashboard-card">
      <div className="judge-section-header" style={{ position: 'relative', minHeight: 40 }}>
        <h2 style={{ margin: 0 }}>{showDoneSubmissions ? 'Finished Submissions' : 'New Submissions'}</h2>
        <button
          className="button-ghost"
          style={{
            fontSize: '0.98em',
            padding: '4px 16px',
            borderRadius: 8,
            position: 'absolute',
            top: 0,
            right: 0,
          }}
          onClick={() => setShowDoneSubmissions((v) => !v)}
        >
          {showDoneSubmissions ? 'Show New' : 'Show Finished'}
        </button>
      </div>
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
                    <td>{submission.textBody}</td>
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
