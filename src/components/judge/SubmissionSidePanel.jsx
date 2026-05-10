import React, { useState } from 'react';
import DownloadRenameModal from '../DownloadRenameModal';

export default function SubmissionSidePanel({
  activeSubmissionId,
  setActiveSubmissionId,
  submissionRows,
  submissions,
  getTaskLabel,
  getSubmissionMediaItems,
  getMediaUrl,
  markSubmissionDone,
  token,
  setSubmissions
}) {
  if (!activeSubmissionId) return null;

  // Try to find the submission in the current table, else fallback to the last known submission in all submissions
  let submission = submissionRows.find(s => s.id === activeSubmissionId);
  if (!submission) {
    submission = submissions.find(s => s.id === activeSubmissionId);
  }
  if (!submission) return null;
  const taskLabel = submission.taskLabel || getTaskLabel(submission.taskNumber);
  const hasMedia = (Array.isArray(submission.mediaItems) && submission.mediaItems.length > 0) || submission.mediaType ? 'Yes' : 'No';
  const [downloadState, setDownloadState] = useState({ isOpen: false, url: '', fileName: '' });

  return (
    <div
      className="judge-side-panel-backdrop"
      role="presentation"
      onClick={() => {
        setActiveSubmissionId('');
      }}
    >
      <aside className="judge-side-panel" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h2>Submission Details</h2>
          </div>
          <button
            className="button-ghost"
            type="button"
            onClick={() => {
              setActiveSubmissionId('');
            }}
          >
            Close
          </button>
        </div>
        <div className="judge-side-panel-section">
          <article className="judge-list-item" style={{ position: 'relative' }}>
            {/* Status badge */}
            <span
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: submission.done ? '#1976d2' : '#43a047',
                color: 'white',
                borderRadius: 12,
                padding: '2px 12px',
                fontSize: '0.95em',
                fontWeight: 600,
                letterSpacing: 0.5,
                zIndex: 1,
              }}
            >
              {submission.done ? 'Finished' : 'New'}
            </span>
            <strong>Task: {taskLabel}</strong>
            <span>Submitted: {new Date(submission.createdAt).toLocaleString('en-IE')}</span>
            <span>Contestant: {submission.displayName}</span>
            <span>Text: {submission.textBody || '-'}</span>
            <span>Media: {hasMedia}</span>
            {submission.mediaItems && submission.mediaItems.length > 0 && (
              <div
                className="judge-media-grid judge-media-grid--panel"
                style={{
                  marginTop: 16,
                  width: '100%',
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                {submission.mediaItems.map((mediaItem, mediaIndex) => {
                  const mediaUrl = getMediaUrl(mediaItem.url);
                  const fileName = mediaItem.originalName || `submission-media-${mediaIndex + 1}`;
                  return mediaItem.type === 'video' ? (
                    <div
                      key={`${submission.id}-panel-video-link-${mediaIndex}`}
                      style={{ flex: '1 1 320px', maxWidth: 480, minWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                      <a
                        className="judge-media-link"
                        href={mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open video ${mediaIndex + 1} in a new tab`}
                        style={{ width: '100%' }}
                      >
                        <video
                          className="judge-media-preview"
                          src={mediaUrl}
                          controls
                          preload="metadata"
                          style={{ width: '100%', borderRadius: 8 }}
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => setDownloadState({ isOpen: true, url: mediaUrl, fileName })}
                        className="button-ghost"
                        style={{ marginTop: 4, fontSize: '0.95em', padding: '2px 10px' }}
                      >
                        Download
                      </button>
                    </div>
                  ) : (
                    <div
                      key={`${submission.id}-panel-image-link-${mediaIndex}`}
                      style={{ flex: '1 1 320px', maxWidth: 480, minWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                      <a
                        className="judge-media-link"
                        href={mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open image ${mediaIndex + 1} in a new tab`}
                        style={{ width: '100%' }}
                      >
                        <img
                          className="judge-media-preview"
                          src={mediaUrl}
                          alt={fileName}
                          loading="lazy"
                          style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => setDownloadState({ isOpen: true, url: mediaUrl, fileName })}
                        className="button-ghost"
                        style={{ marginTop: 4, fontSize: '0.95em', padding: '2px 10px' }}
                      >
                        Download
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Mark as Done button */}
            {!submission.done && (
              <button
                className="button"
                style={{ marginTop: 16, width: '100%' }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await markSubmissionDone(token, submission.id, true);
                    setSubmissions((prev) => prev.map((s) =>
                      s.id === submission.id ? { ...s, done: true } : s
                    ));
                  } catch (err) {
                    alert('Failed to mark as done: ' + (err?.message || err));
                  }
                }}
              >
                Mark as Finished
              </button>
            )}
            {submission.done && (
              <button
                className="button"
                style={{ marginTop: 16, width: '100%' }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await markSubmissionDone(token, submission.id, false);
                    setSubmissions((prev) => prev.map((s) =>
                      s.id === submission.id ? { ...s, done: false } : s
                    ));
                  } catch (err) {
                    alert('Failed to undo: ' + (err?.message || err));
                  }
                }}
              >
                Mark as New
              </button>
            )}
          </article>
        </div>
      </aside>
      <DownloadRenameModal
        isOpen={downloadState.isOpen}
        url={downloadState.url}
        fileName={downloadState.fileName}
        onClose={() => setDownloadState({ isOpen: false, url: '', fileName: '' })}
      />
    </div>
  );
}
