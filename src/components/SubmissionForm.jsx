import { useEffect, useMemo, useRef, useState } from 'react'

function toTitleCase(value) {
  return value
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
}

function setFilePickerOpenState(isOpen) {
  document.body.classList.toggle('file-picker-open', isOpen)
}

const MAX_MEDIA_FILES = 10
const LARGE_VIDEO_WARNING_BYTES = 500 * 1024 * 1024

function restoreRootScrollPosition(scrollTop) {
  const rootElement = document.getElementById('root')

  if (!rootElement || typeof scrollTop !== 'number') {
    return
  }

  rootElement.scrollTop = scrollTop
}

function revokePreviewUrls(previews) {
  for (const preview of previews) {
    URL.revokeObjectURL(preview.url)
  }
}

function getFileKey(file) {
  return `${file.name}::${file.size}::${file.lastModified}`
}

function mergeUniqueFiles(existingFiles, nextFiles) {
  const keys = new Set(existingFiles.map(getFileKey))
  const merged = [...existingFiles]

  for (const file of nextFiles) {
    const key = getFileKey(file)
    if (!keys.has(key)) {
      merged.push(file)
      keys.add(key)
    }
  }

  return merged.slice(0, MAX_MEDIA_FILES)
}

function SubmissionForm({
  isSubmitting,
  onSubmit,
  fixedTaskNumber = null,
  availableTasks = [],
}) {
  const hasFixedTaskNumber = Number.isInteger(fixedTaskNumber) && fixedTaskNumber > 0
  const [taskNumber, setTaskNumber] = useState('')
  const [textBody, setTextBody] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const pickerScrollTopRef = useRef(0)

  const fileName = useMemo(() => {
    if (files.length === 0) {
      return 'No file selected'
    }

    if (files.length === 1) {
      return files[0].name
    }

    return `${files.length} files selected`
  }, [files])
  const shouldShowLargeVideoWarning = useMemo(
    () => files.some((file) => file.type.startsWith('video/') && file.size >= LARGE_VIDEO_WARNING_BYTES),
    [files],
  )
  const hasSubmissionContent = Boolean(files.length > 0 || textBody.trim())
  const copy = {
    fileEmpty: 'No file selected',
    chooseFile: 'Add file',
    taskNumber: 'Task name',
    taskPlaceholder: 'Choose a task',
    mediaLabel: 'Photos or videos',
    mediaHint: 'Attach up to 10 photos/videos, a text body, or both. Phone videos should usually upload fine. If you filmed on a GoPro, compress or export the video before uploading.',
    textLabel: 'Body of text',
    textPlaceholder: 'Write your task response here',
    previewAlt: 'Selected media preview',
    footerHint: 'Add either media, text, or both before submitting.',
    footerHintWithTask: 'Task name is required. Add either media, text, or both before submitting.',
    largeVideoWarning:
      'Large videos can take a while to upload. If this was filmed on a GoPro or other action camera, compress or export it before uploading for the best chance of success.',
    submitting: 'Submitting\u2026',
    submit: 'Submit task',
  }

  useEffect(() => {
    if (hasFixedTaskNumber) {
      setTaskNumber(String(fixedTaskNumber))
    }
  }, [fixedTaskNumber, hasFixedTaskNumber])

  useEffect(() => {
    return () => {
      revokePreviewUrls(previews)
    }
  }, [previews])

  function handleFileChange(event) {
    const nextFiles = Array.from(event.target.files ?? [])
    setFilePickerOpenState(false)
    window.requestAnimationFrame(() => restoreRootScrollPosition(pickerScrollTopRef.current))

    if (nextFiles.length === 0) {
      return
    }

    setFiles((currentFiles) => {
      const mergedFiles = mergeUniqueFiles(currentFiles, nextFiles)

      setPreviews((currentPreviews) => {
        revokePreviewUrls(currentPreviews)
        return mergedFiles.map((file) => ({
          url: URL.createObjectURL(file),
          kind: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name,
        }))
      })

      return mergedFiles
    })

    event.target.value = ''
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) {
        window.setTimeout(() => {
          setFilePickerOpenState(false)
          restoreRootScrollPosition(pickerScrollTopRef.current)
        }, 50)
      }
    }

    window.addEventListener('focus', handleVisibilityChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      setFilePickerOpenState(false)
      window.removeEventListener('focus', handleVisibilityChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedTaskNumber = hasFixedTaskNumber ? fixedTaskNumber : Number(taskNumber)

    if (!Number.isInteger(normalizedTaskNumber) || normalizedTaskNumber < 1) {
      return
    }

    if (files.length === 0 && !textBody.trim()) {
      return
    }

    await onSubmit({
      files,
      taskNumber: normalizedTaskNumber,
      textBody: textBody.trim(),
    })

    if (!hasFixedTaskNumber) {
      setTaskNumber('')
    }
    setTextBody('')
    setFiles([])
    revokePreviewUrls(previews)
    setPreviews([])
    event.currentTarget.reset()

    if (hasFixedTaskNumber) {
      setTaskNumber(String(fixedTaskNumber))
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      {hasFixedTaskNumber ? null : (
        <div className="field">
          <label htmlFor="taskNumber">{copy.taskNumber}</label>
          <select
            id="taskNumber"
            name="taskNumber"
            value={taskNumber}
            onChange={(event) => setTaskNumber(event.target.value)}
            required
          >
            <option value="">{copy.taskPlaceholder}</option>
            {availableTasks.map((task) => (
              <option key={task.taskNumber} value={String(task.taskNumber)}>
                {toTitleCase(task.title)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="media">{copy.mediaLabel}</label>
        <input
          className="file-input-hidden"
          id="media"
          name="media"
          type="file"
          accept="image/*,video/*"
          multiple
          onClick={() => {
            const rootElement = document.getElementById('root')
            pickerScrollTopRef.current = rootElement?.scrollTop ?? 0
            setFilePickerOpenState(true)
          }}
          onChange={handleFileChange}
        />
        <label className="button-secondary file-picker-button" htmlFor="media">
          {copy.chooseFile}
        </label>
        <span className="field-hint">{copy.mediaHint}</span>
      </div>

      <div className="field">
        <label htmlFor="textBody">{copy.textLabel}</label>
        <textarea
          id="textBody"
          name="textBody"
          value={textBody}
          onChange={(event) => setTextBody(event.target.value)}
          maxLength={4000}
          placeholder={copy.textPlaceholder}
        />
        <span className="field-hint">{textBody.length}/4000 characters</span>
      </div>

      {previews.length > 0 ? (
        <div className="submission-preview-grid">
          {previews.map((preview) =>
            preview.kind === 'image' ? (
              <img key={preview.url} className="submission-preview" src={preview.url} alt={copy.previewAlt} />
            ) : (
              <video
                key={preview.url}
                className="submission-preview"
                src={preview.url}
                controls
                preload="metadata"
              />
            ),
          )}
        </div>
      ) : null}

      {shouldShowLargeVideoWarning ? <div className="error-banner">{copy.largeVideoWarning}</div> : null}

      <div className="mini-card">
        <strong>{files.length > 0 ? fileName : copy.fileEmpty}</strong>
        {!hasSubmissionContent ? (
          <p className="meta-text">
            {hasFixedTaskNumber ? copy.footerHint : copy.footerHintWithTask}
          </p>
        ) : null}
      </div>

      <button
        className="button"
        type="submit"
        disabled={
          isSubmitting ||
          (!hasFixedTaskNumber && (!taskNumber || Number(taskNumber) < 1)) ||
          (files.length === 0 && !textBody.trim())
        }
      >
        {isSubmitting ? copy.submitting : copy.submit}
      </button>
    </form>
  )
}

export default SubmissionForm
