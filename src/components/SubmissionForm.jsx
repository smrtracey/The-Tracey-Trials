import { useEffect, useMemo, useState } from 'react'

function toTitleCase(value) {
  return value
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
}

function SubmissionForm({
  isSubmitting,
  onSubmit,
  fixedTaskNumber = null,
  language = 'en',
  availableTasks = [],
}) {
  const hasFixedTaskNumber = Number.isInteger(fixedTaskNumber) && fixedTaskNumber > 0
  const [taskNumber, setTaskNumber] = useState('')
  const [textBody, setTextBody] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewKind, setPreviewKind] = useState('')

  const fileName = useMemo(() => file?.name ?? 'No file selected', [file])
  const copy = {
    fileEmpty: language === 'pt' ? 'Nenhum arquivo selecionado' : 'No file selected',
    chooseFile: language === 'pt' ? 'Escolher arquivo' : 'Choose file',
    taskNumber: language === 'pt' ? 'Número da tarefa' : 'Task number',
    taskPlaceholder: language === 'pt' ? 'Escolha uma tarefa' : 'Choose a task',
    mediaLabel: language === 'pt' ? 'Foto ou vídeo (opcional)' : 'Photo or video (optional)',
    mediaHint:
      language === 'pt'
        ? 'Anexe uma foto/vídeo, um texto, ou ambos.'
        : 'Attach a photo/video, a text body, or both.',
    textLabel: language === 'pt' ? 'Texto (opcional)' : 'Body of text (optional)',
    textPlaceholder:
      language === 'pt' ? 'Escreva sua resposta da tarefa aqui' : 'Write your task response here',
    previewAlt: language === 'pt' ? 'Pré-visualização selecionada' : 'Selected preview',
    footerHint:
      language === 'pt'
        ? 'Adicione mídia, texto, ou ambos antes de enviar.'
        : 'Add either media, text, or both before submitting.',
    footerHintWithTask:
      language === 'pt'
        ? 'O número da tarefa é obrigatório. Adicione mídia, texto, ou ambos antes de enviar.'
        : 'Task number is required. Add either media, text, or both before submitting.',
    submitting: language === 'pt' ? 'Enviando…' : 'Submitting…',
    submit: language === 'pt' ? 'Enviar tarefa' : 'Submit task',
  }

  useEffect(() => {
    if (hasFixedTaskNumber) {
      setTaskNumber(String(fixedTaskNumber))
    }
  }, [fixedTaskNumber, hasFixedTaskNumber])

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)

    if (!nextFile) {
      setPreviewUrl('')
      setPreviewKind('')
      return
    }

    const localUrl = URL.createObjectURL(nextFile)
    setPreviewUrl(localUrl)
    setPreviewKind(nextFile.type.startsWith('video/') ? 'video' : 'image')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedTaskNumber = hasFixedTaskNumber ? fixedTaskNumber : Number(taskNumber)

    if (!Number.isInteger(normalizedTaskNumber) || normalizedTaskNumber < 1) {
      return
    }

    if (!file && !textBody.trim()) {
      return
    }

    await onSubmit({
      file,
      taskNumber: normalizedTaskNumber,
      textBody: textBody.trim(),
    })

    if (!hasFixedTaskNumber) {
      setTaskNumber('')
    }
    setTextBody('')
    setFile(null)
    setPreviewUrl('')
    setPreviewKind('')
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

      {previewUrl && previewKind === 'image' ? (
        <img className="submission-preview" src={previewUrl} alt={copy.previewAlt} />
      ) : null}

      {previewUrl && previewKind === 'video' ? (
        <video className="submission-preview" src={previewUrl} controls preload="metadata" />
      ) : null}

      <div className="mini-card">
        <strong>{file ? fileName : copy.fileEmpty}</strong>
        <p className="meta-text">
          {hasFixedTaskNumber ? copy.footerHint : copy.footerHintWithTask}
        </p>
      </div>

      <button
        className="button"
        type="submit"
        disabled={
          isSubmitting ||
          (!hasFixedTaskNumber && (!taskNumber || Number(taskNumber) < 1)) ||
          (!file && !textBody.trim())
        }
      >
        {isSubmitting ? copy.submitting : copy.submit}
      </button>
    </form>
  )
}

export default SubmissionForm
