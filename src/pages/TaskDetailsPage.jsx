import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

function getTaskTypes(task) {
  if (Array.isArray(task?.taskTypes) && task.taskTypes.length > 0) {
    return task.taskTypes
  }

  return [task?.category ?? 'common']
}

function isRecurringTask(task) {
  return getTaskTypes(task).includes('recurring')
}

function isAutocompleteTask(task) {
  return getTaskTypes(task).includes('autocomplete')
}

function isOneWayCompletionTask(task) {
  return isAutocompleteTask(task) || task?.taskNumber === 1
}

function formatLongGameDate(dateString) {
  if (!dateString) {
    return ''
  }

  const parsed = new Date(`${dateString}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return dateString
  }

  return new Intl.DateTimeFormat('en-IE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

function TaskDetailsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
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
  const [pendingLongGameChoice, setPendingLongGameChoice] = useState('')
  const [isLoading, setIsLoading] = useState(true)

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
  const isRecurring = isRecurringTask(task)
  const isCompleted = !isRecurring && Boolean(task?.isCompleted)
  const isCompletionLocked = isOneWayCompletionTask(task) && isCompleted

  const shouldShowSubmissionForm = task?.hasSubmission !== false

  async function handleToggleCompletion() {
    if (!task || isRecurringTask(task) || (isOneWayCompletionTask(task) && task.isCompleted)) {
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
      const data = await createSubmission({ token, ...payload })
      if (Array.isArray(data?.completedTaskNumbers)) {
        setTask((current) =>
          current
            ? { ...current, isCompleted: data.completedTaskNumbers.includes(current.taskNumber) }
            : current,
        )
      }
      setSubmitSuccess('Task submitted successfully.')
    } catch (taskSubmitError) {
      setSubmitError(taskSubmitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSelectLongGameChoice(choice) {
    setLongGameError('')

    try {
      await saveLongGameChoice(token, choice)
      setLongGameStatus((current) => (current ? { ...current, currentChoice: choice } : current))
    } catch (choiceError) {
      setLongGameError(choiceError.message)
    }
  }

  function handleConfirmLongGameChoice(choice) {
    setPendingLongGameChoice(choice)
  }

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/')
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
    back: 'Back',
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
    longGameNextRoundLabel: 'Next round begins',
    longGameOpponentLabel: 'Opponent',
    longGameStatusActive: 'Active now',
    longGameStatusUpcoming: 'Upcoming round',
    longGameStatusCompleted: 'Round closed',
    longGameBye: 'You have no opponent in this round.',
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

  const shouldShowLongGameCard = Boolean(task?.taskNumber === 20 && longGameStatus)

  function renderLongGameContent() {
    if (!longGameStatus) {
      return null
    }

    const statusLabel =
      longGameStatus.roundStatus === 'upcoming'
        ? copy.longGameStatusUpcoming
        : longGameStatus.roundStatus === 'completed'
          ? copy.longGameStatusCompleted
          : copy.longGameStatusActive

    const nextRoundText = formatLongGameDate(longGameStatus.nextRoundStartDate)

    return (
      <>
        <div className="long-game-meta">
          <div className="long-game-meta-row">
            <span className="long-game-meta-label">{copy.longGameRoundLabel}</span>
            <span className="long-game-meta-value">{longGameStatus.roundNumber}</span>
          </div>

          <div className="long-game-meta-row">
            <span className="long-game-meta-label">Status</span>
            <span className="long-game-meta-value">{statusLabel}</span>
          </div>

          {nextRoundText ? (
            <div className="long-game-meta-row long-game-meta-row--next-round">
              <span className="long-game-meta-label">{copy.longGameNextRoundLabel}</span>
              <span className="long-game-meta-value">{nextRoundText}</span>
            </div>
          ) : null}

          {longGameStatus.opponent ? (
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">{copy.longGameOpponentLabel}</span>
              <span className="long-game-meta-value">{longGameStatus.opponent.displayName}</span>
            </div>
          ) : null}
        </div>

        {longGameError ? <div className="error-banner">{longGameError}</div> : null}

        {longGameStatus.isBye ? <p className="muted">{copy.longGameBye}</p> : null}

        {!longGameStatus.isBye && !longGameStatus.opponent ? (
          <p className="muted">{copy.longGameMissingOpponent}</p>
        ) : null}

        {!longGameStatus.isBye && longGameStatus.opponent && longGameStatus.currentChoice ? (
          <p className="muted long-game-choice-summary">
            You've chosen to{' '}
            <span className={`long-game-choice-word long-game-choice-word--${longGameStatus.currentChoice}`}>
              {longGameStatus.currentChoice}
            </span>{' '}
            {longGameStatus.currentChoice === 'cooperate' ? 'with ' : ''}
            {longGameStatus.opponent.displayName}
          </p>
        ) : null}

        {!longGameStatus.isBye &&
        longGameStatus.opponent &&
        longGameStatus.roundStatus === 'active' &&
        !longGameStatus.currentChoice ? (
          <div className="long-game-choice-prompt">
            <p className="muted">{copy.longGameChoosePrompt}</p>
            <div className="long-game-choice-buttons">
              <button
                className="button long-game-cooperate-button"
                type="button"
                onClick={() => handleConfirmLongGameChoice('cooperate')}
              >
                {copy.cooperate}
              </button>
              <button
                className="button-ghost long-game-betray-button"
                type="button"
                onClick={() => handleConfirmLongGameChoice('betray')}
              >
                {copy.betray}
              </button>
            </div>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <main className="app-shell">
      <section className="task-details-layout">
        <div className="button-row">
          <button className="button-ghost" type="button" onClick={handleGoBack}>
            {copy.back}
          </button>
        </div>

        <article className="panel task-details-panel">
          {isLoading ? <p className="muted">{copy.loading}</p> : null}

          {!isLoading && error ? <div className="error-banner">{error}</div> : null}

          {!isLoading && !error && task ? (
            <>
              <header className="task-details-header">
                {isRecurring ? (
                  <span className="pill task-repeat-pill">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M17 2l4 4-4 4" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <path d="M7 22l-4-4 4-4" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    Recurring task
                  </span>
                ) : (
                  <>
                    <span className={`pill ${isCompleted ? 'task-pill-complete' : ''}`}>
                      {isCompleted ? copy.completed : copy.notCompleted}
                    </span>
                    <button
                      className="button-secondary task-completion-button"
                      type="button"
                      onClick={handleToggleCompletion}
                      disabled={isSavingCompletion || isCompletionLocked}
                    >
                      {isCompleted ? copy.markNotCompleted : copy.markCompleted}
                    </button>
                  </>
                )}
              </header>

              {!isRecurring && completionError ? <div className="error-banner">{completionError}</div> : null}

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

              {shouldShowLongGameCard ? (
                <section className="task-meta-card long-game-card">
                  <div className="long-game-header-row">
                    <h2>{copy.longGameTitle}</h2>
                    {longGameStatus ? (
                      <span className="pill">
                        {longGameStatus.roundStatus === 'active'
                          ? copy.longGameStatusActive
                          : longGameStatus.roundStatus === 'upcoming'
                            ? copy.longGameStatusUpcoming
                            : copy.longGameStatusCompleted}
                      </span>
                    ) : null}
                  </div>

                  <div className="long-game-content">{renderLongGameContent()}</div>
                </section>
              ) : null}

              {shouldShowSubmissionForm ? (
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
                    fixedTask={task}
                  />
                </section>
              ) : null}
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
