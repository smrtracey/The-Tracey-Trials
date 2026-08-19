import { useState } from 'react'
import { buildDownloadFileName, downloadFile } from '../lib/download'

export default function DownloadRenameModal({ fileName, url, token = '', onClose }) {
  const [nextFileName, setNextFileName] = useState(fileName || 'download')
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState('')

  async function handleDownload() {
    try {
      setIsDownloading(true)
      setError('')
      const resolvedFileName = buildDownloadFileName(fileName, nextFileName)
      await downloadFile(url, resolvedFileName, token)
      onClose()
    } catch (downloadError) {
      setError(downloadError?.message || 'Failed to download file.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="app-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="task-meta-card app-modal-card download-rename-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-rename-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="download-rename-modal__header">
          <h2 id="download-rename-title">Rename Download</h2>
          <button type="button" className="button-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted">Choose the file name to save on the device.</p>
        <div className="field">
          <label htmlFor="download-file-name">File name</label>
          <input
            id="download-file-name"
            value={nextFileName}
            onChange={(event) => setNextFileName(event.target.value)}
            autoFocus
          />
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <div className="download-rename-modal__actions">
          <button type="button" className="button" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? 'Downloading…' : 'Download'}
          </button>
          <button type="button" className="button-ghost" onClick={onClose} disabled={isDownloading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
