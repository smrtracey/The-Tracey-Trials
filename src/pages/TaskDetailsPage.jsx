import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SubmissionForm from '../components/SubmissionForm'
import { useAuth } from '../hooks/useAuth'
import {
  createSubmission,
  fetchLongGameStatus,
  fetchTaskDetails,
  saveLongGameChoice,
  updateTaskCompletion,
} from '../lib/api'

function toTitleCase(value) {
  return value
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
}

function formatLongGameCountdown(endDate, nowTimestamp) {
  if (!endDate) {
    return '--'
  }

  const targetDate = new Date(`${endDate}T23:59:59`)

  if (Number.isNaN(targetDate.getTime())) {
    return '--'
  }

  const remainingMs = Math.max(0, targetDate.getTime() - nowTimestamp)
  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return `${days}d ${hours}h ${minutes}m ${seconds}s`
}

function TaskDetailsPage() {
  const { token, user } = useAuth()
  const { taskNumber: taskDisplayNumber } = useParams()
  const [task, setTask] = useState(null)
  const [error, setError] = useState('')
  const [completionError, setCompletionError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingCompletion, setIsSavingCompletion] = useState(false)
  const [longGameStatus, setLongGameStatus] = useState(null)
  const [longGameError, setLongGameError] = useState('')
  const [isSavingLongGameChoice, setIsSavingLongGameChoice] = useState(false)
  const [pendingLongGameChoice, setPendingLongGameChoice] = useState('')
  const [longGameNow, setLongGameNow] = useState(() => Date.now())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLongGameNow(Date.now())
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadTask() {
      try {
        const data = await fetchTaskDetails(token, taskDisplayNumber)

        if (isMounted) {
          setTask(data.task)
          setError('')
        }
      } catch (taskError) {
        if (isMounted) {
          setError(taskError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTask()

    return () => {
      isMounted = false
    }
  }, [taskDisplayNumber, token])

  useEffect(() => {
    let isMounted = true

    async function loadLongGameStatus() {
      if (!task || task.taskNumber !== 20) {
        if (isMounted) {
          setLongGameStatus(null)
          setLongGameError('')
        }
        return
      }

      try {
        const data = await fetchLongGameStatus(token)

        if (isMounted) {
          setLongGameStatus(data.longGame)
          setLongGameError('')
        }
      } catch (statusError) {
        if (isMounted) {
          setLongGameError(statusError.message)
        }
      }
    }

    loadLongGameStatus()

    return () => {
      isMounted = false
    }
  }, [task, token])

  const title = useMemo(() => {
    if (!task) {
      return ''
    }

    return toTitleCase(task.title)
  }, [task])

  const localizedTaskText = useMemo(() => ({
    goal: task?.goal ?? '',
    description: task?.description ?? '',
  }), [task])

  async function handleToggleCompletion() {
    if (!task) {
      return
    }

    const previousIsCompleted = task.isCompleted
    const nextIsCompleted = !previousIsCompleted

    setCompletionError('')
    setIsSavingCompletion(true)
    setTask((current) => (current ? { ...current, isCompleted: nextIsCompleted } : current))

    try {
      const data = await updateTaskCompletion(token, task.taskNumber, nextIsCompleted)
      setTask((current) => (current ? { ...current, isCompleted: data.isCompleted } : current))
    } catch (taskCompletionError) {
      setTask((current) => (current ? { ...current, isCompleted: previousIsCompleted } : current))
      setCompletionError(taskCompletionError.message)
    } finally {
      setIsSavingCompletion(false)
    }
  }

  async function handleCreateSubmission(payload) {
    setSubmitError('')
    setSubmitSuccess('')
    setIsSubmitting(true)

    try {
      await createSubmission({ token, ...payload })
      setSubmitSuccess('Task submitted successfully.')
    } catch (taskSubmitError) {
      setSubmitError(taskSubmitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSelectLongGameChoice(choice) {
    setLongGameError('')
    setIsSavingLongGameChoice(true)

    try {
      await saveLongGameChoice(token, choice)
      setLongGameStatus((current) => (current ? { ...current, currentChoice: choice } : current))
    } catch (choiceError) {
      setLongGameError(choiceError.message)
    } finally {
      setIsSavingLongGameChoice(false)
    }
  }

  function handleConfirmLongGameChoice(choice) {
    if (!choice || isSavingLongGameChoice || longGameStatus?.currentChoice) {
      return
    }

    setPendingLongGameChoice(choice)
  }

  function handleCancelLongGameChoice() {
    setPendingLongGameChoice('')
  }

  async function handleApproveLongGameChoice() {
    if (!pendingLongGameChoice) {
      return
    }

    const choiceToSave = pendingLongGameChoice
    setPendingLongGameChoice('')
    await handleSelectLongGameChoice(choiceToSave)
  }

  const copy = {
    back: 'Back to home',
    loading: 'Loading task details…',
    completed: 'Completed',
    notCompleted: 'Not completed',
    markCompleted: 'Mark as completed',
    markNotCompleted: 'Mark as not completed',
    goal: 'Goal',
    description: 'Description',
    deadline: 'Deadline',
    longGameTitle: 'This round duel',
    longGameRoundLabel: 'Round',
    longGameCountdownLabel: 'Time remaining',
    longGameOpponentLabel: 'Opponent',
    longGameStatusActive: 'Active now',
    longGameStatusUpcoming: 'Upcoming round',
    longGameStatusCompleted: 'Round closed',
    longGameBye: 'You have a bye in this round.',
    longGameMissingOpponent: 'Your opponent could not be resolved for this round.',
    cooperate: 'Cooperate',
    betray: 'Betray',
    longGameYourChoice: 'Your choice',
    longGameChoosePrompt: 'Make your choice',
    longGameConfirmTitle: 'Confirm choice',
    longGameConfirmBody: 'Do you want to confirm your choice?',
    confirm: 'Confirm',
    cancel: 'Cancel',
    submitTitle: 'Submit for this task',
    submitHint: 'Upload media, write text, or include both.',
  }

  const shouldShowLongGameCard = Boolean(
    longGameStatus &&
      longGameStatus.roundStatus === 'active' &&
      !longGameStatus.isBye &&
      longGameStatus.opponent,
  )

  return (
    <main className="app-shell">
      <section className="task-details-layout">
        <div className="button-row">
          <Link className="button-ghost" to="/">
            {copy.back}
          </Link>
        </div>

        <article className="panel task-details-panel">
          {isLoading ? <p className="muted">{copy.loading}</p> : null}

          {!isLoading && error ? <div className="error-banner">{error}</div> : null}

          {!isLoading && !error && task ? (
            <>
              <header className="task-details-header">
                <span className={`pill ${task.isCompleted ? 'task-pill-complete' : ''}`}>
                  {task.isCompleted ? copy.completed : copy.notCompleted}
                </span>
                <button
                  className="button-secondary task-completion-button"
                  type="button"
                  onClick={handleToggleCompletion}
                  disabled={isSavingCompletion}
                >
                  {task.isCompleted ? copy.markNotCompleted : copy.markCompleted}
                </button>
              </header>

              {completionError ? <div className="error-banner">{completionError}</div> : null}

              <h1>{title}</h1>

              <div className="task-meta-grid">
                <div className="task-meta-card">
                  <h2>{copy.goal}</h2>
                  <p>{localizedTaskText.goal}</p>
                </div>

                <div className="task-meta-card">
                  <h2>{copy.description}</h2>
                  <p>{localizedTaskText.description}</p>
                </div>

                {task.hasTimeConstraint && task.deadlineLabel ? (
                  <div className="task-meta-card">
                    <h2>{copy.deadline}</h2>
                    <p>{task.deadlineLabel}</p>
                  </div>
                ) : null}
              </div>

              {task.taskNumber === 20 && shouldShowLongGameCard ? (
                <section className="task-meta-card long-game-card">
                  <div className="long-game-header-row">
                    <h2>{copy.longGameTitle}</h2>
                    {longGameStatus ? (
                      <span className="pill">
                        {longGameStatus.roundStatus === 'active'
                          ? copy.longGameStatusActive
                          : copy.longGameStatusCompleted}
                      </span>
                    ) : null}
                  </div>

                  {longGameError ? <div className="error-banner">{longGameError}</div> : null}

                  {longGameStatus ? (
                    <div className="long-game-content">
                      {longGameStatus.currentChoice ? (
                        <p className="muted long-game-choice-summary">
                          You've chosen to{' '}
                          <span
                            className={`long-game-choice-word long-game-choice-word--${longGameStatus.currentChoice}`}
                          >
                            {longGameStatus.currentChoice}
                          </span>{' '}
                          {longGameStatus.currentChoice === 'cooperate' ? 'with ' : ''}
                          {longGameStatus.opponent.displayName}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="stack">
                <div className="panel-header">
                  <div>
                    <h2>{copy.submitTitle}</h2>
                    <p className="muted">{copy.submitHint}</p>
                  </div>
                </div>

                {submitError ? <div className="error-banner">{submitError}</div> : null}
                {submitSuccess ? <div className="success-banner">{submitSuccess}</div> : null}

                <SubmissionForm
                  isSubmitting={isSubmitting}
                  onSubmit={handleCreateSubmission}
                  fixedTaskNumber={task.taskNumber}
                />
              </section>
            </>
          ) : null}
        </article>
      </section>

      {pendingLongGameChoice ? (
        <div className="mandatory-info-backdrop" role="presentation" onClick={handleCancelLongGameChoice}>
          <div
            className="mandatory-info-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={copy.longGameConfirmTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{copy.longGameConfirmTitle}</h3>
            <p>
              {copy.longGameConfirmBody}{' '}
              <strong>{pendingLongGameChoice === 'cooperate' ? copy.cooperate : copy.betray}</strong>
            </p>
            <div className="mandatory-info-actions">
              <button className="button-ghost" type="button" onClick={handleCancelLongGameChoice}>
                {copy.cancel}
              </button>
              <button className="button-secondary" type="button" onClick={handleApproveLongGameChoice}>
                {copy.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default TaskDetailsPage
