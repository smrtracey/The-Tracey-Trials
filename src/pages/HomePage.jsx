import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SubmissionForm from '../components/SubmissionForm'
import { useAuth } from '../hooks/useAuth'
import { subscribeToPushNotifications } from '../lib/push'
import {
  createSubmission,
  fetchCompletedTasks,
  fetchLongGameStatus,
  saveLongGameChoice,
  updateCompletedTasks,
} from '../lib/api'

function getNewYearsEveTimestamp(referenceDate) {
  const year = referenceDate.getFullYear()
  let target = new Date(year, 11, 31, 0, 0, 0, 0)

  if (referenceDate >= target) {
    target = new Date(year + 1, 11, 31, 0, 0, 0, 0)
  }

  return target.getTime()
}

function toTitleCase(value) {
  return value
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
}

function getCategorySymbol(category) {
  if (category === 'timed') {
    return '⏰'
  }

  if (category === 'special') {
    return '★'
  }

  if (category === 'race') {
    return '🏁'
  }

  return ''
}

function getCategoryInfoKey(category) {
  if (category === 'timed') {
    return 'timed'
  }

  if (category === 'special') {
    return 'special'
  }

  if (category === 'race') {
    return 'race'
  }

  return ''
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

function HomePage() {
  const { token, user, signOut } = useAuth()
  const [now, setNow] = useState(() => Date.now())
  const [activeIconInfo, setActiveIconInfo] = useState('')
  const [tasks, setTasks] = useState([])
  const [completedTaskNumbers, setCompletedTaskNumbers] = useState([])
  const [isTaskListLoading, setIsTaskListLoading] = useState(true)
  const [isTaskListSaving, setIsTaskListSaving] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [longGameStatus, setLongGameStatus] = useState(null)
  const [longGameError, setLongGameError] = useState('')
  const [isLongGameLoading, setIsLongGameLoading] = useState(false)
  const [isSavingLongGameChoice, setIsSavingLongGameChoice] = useState(false)
  const [pendingLongGameChoice, setPendingLongGameChoice] = useState('')
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)
  const [isInstallingApp, setIsInstallingApp] = useState(false)
  const [isIosSafari, setIsIosSafari] = useState(false)
  const [isAppInstalled, setIsAppInstalled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )
  const [notificationMessage, setNotificationMessage] = useState('')
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false)
  const [isTaskCardExpanded, setIsTaskCardExpanded] = useState(() => {
    const key = `tracey-trials-task-card-expanded-${user.id}`
    return localStorage.getItem(key) !== 'false'
  })

  const visitKey = useMemo(() => `tracey-trials-home-visited-${user.id}`, [user.id])
  const installDismissKey = useMemo(() => `tracey-trials-install-dismissed-${user.id}`, [user.id])
  const isFirstVisit = useMemo(() => localStorage.getItem(visitKey) !== 'true', [visitKey])
  const [isInstallPromptDismissed, setIsInstallPromptDismissed] = useState(
    () => localStorage.getItem(installDismissKey) === 'true',
  )

  useEffect(() => {
    if (isFirstVisit) {
      localStorage.setItem(visitKey, 'true')
    }
  }, [isFirstVisit, visitKey])

  useEffect(() => {
    const key = `tracey-trials-task-card-expanded-${user.id}`
    localStorage.setItem(key, String(isTaskCardExpanded))
  }, [isTaskCardExpanded, user.id])

  useEffect(() => {
    setIsInstallPromptDismissed(localStorage.getItem(installDismissKey) === 'true')
  }, [installDismissKey])

  useEffect(() => {
    function syncNotificationPermission() {
      if (typeof Notification === 'undefined') {
        return
      }

      setNotificationPermission(Notification.permission)
    }

    syncNotificationPermission()
    window.addEventListener('focus', syncNotificationPermission)
    document.addEventListener('visibilitychange', syncNotificationPermission)

    return () => {
      window.removeEventListener('focus', syncNotificationPermission)
      document.removeEventListener('visibilitychange', syncNotificationPermission)
    }
  }, [])

  useEffect(() => {
    function checkInstalledMode() {
      if (typeof window === 'undefined') {
        return false
      }

      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      )
    }

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
    const isIos = /iphone|ipad|ipod/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|chrome/.test(userAgent)

    setIsIosSafari(isIos && isSafari)
    setIsAppInstalled(checkInstalledMode())

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredInstallPrompt(event)
    }

    function handleAppInstalled() {
      setIsAppInstalled(true)
      setDeferredInstallPrompt(null)
      setIsInstallPromptDismissed(true)
      localStorage.setItem(installDismissKey, 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [installDismissKey])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadCompletedTasks() {
      try {
        const data = await fetchCompletedTasks(token)
        if (isMounted) {
          setCompletedTaskNumbers(data.completedTaskNumbers)
          setTasks(data.tasks ?? [])
          setTaskError('')
        }
      } catch (taskLoadError) {
        if (isMounted) {
          setTaskError(taskLoadError.message)
        }
      } finally {
        if (isMounted) {
          setIsTaskListLoading(false)
        }
      }
    }

    loadCompletedTasks()

    return () => {
      isMounted = false
    }
  }, [token])

  const longGameTask = useMemo(
    () => tasks.find((task) => task.taskNumber === 20) ?? null,
    [tasks],
  )

  useEffect(() => {
    let isMounted = true

    async function loadLongGameStatus() {
      if (!longGameTask) {
        if (isMounted) {
          setLongGameStatus(null)
          setLongGameError('')
          setIsLongGameLoading(false)
        }
        return
      }

      if (isMounted) {
        setIsLongGameLoading(true)
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
      } finally {
        if (isMounted) {
          setIsLongGameLoading(false)
        }
      }
    }

    loadLongGameStatus()

    return () => {
      isMounted = false
    }
  }, [longGameTask, token])

  async function handleCreateSubmission(payload) {
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      await createSubmission({ token, ...payload })
      setSuccessMessage('Task submitted successfully.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEnableNotifications() {
    if (!isAppInstalled && isIosSafari) {
      setNotificationMessage('Install to Home Screen first, then tap Enable notifications.')
      return
    }

    if (!(typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window)) {
      setNotificationMessage('Notifications are not available in this browser mode.')
      return
    }

    if (notificationPermission === 'denied') {
      setNotificationMessage('Notifications are blocked. Enable them in iPhone Settings > Notifications > Tracey Trials.')
      return
    }

    setIsEnablingNotifications(true)
    setNotificationMessage('')

    try {
      await subscribeToPushNotifications(token)
      const permission = Notification.permission
      setNotificationPermission(permission)

      if (permission === 'granted') {
        setNotificationMessage('Notifications enabled.')
      } else {
        setNotificationMessage('Notification permission was not granted.')
      }
    } finally {
      setIsEnablingNotifications(false)
    }
  }

  async function handleToggleTask(taskNumber) {
    const isCompleted = completedTaskNumbers.includes(taskNumber)
    const nextCompleted = isCompleted
      ? completedTaskNumbers.filter((value) => value !== taskNumber)
      : [...completedTaskNumbers, taskNumber].sort((a, b) => a - b)

    setCompletedTaskNumbers(nextCompleted)
    setTaskError('')
    setIsTaskListSaving(true)

    try {
      const data = await updateCompletedTasks(token, nextCompleted)
      setCompletedTaskNumbers(data.completedTaskNumbers)
    } catch (saveError) {
      setCompletedTaskNumbers(completedTaskNumbers)
      setTaskError(saveError.message)
    } finally {
      setIsTaskListSaving(false)
    }
  }

  async function handleSelectLongGameChoice(choice) {
    setLongGameError('')
    setIsSavingLongGameChoice(true)
    setLongGameStatus((current) => (current ? { ...current, currentChoice: choice } : current))

    try {
      await saveLongGameChoice(token, choice)
    } catch (choiceError) {
      setLongGameStatus((current) => (current ? { ...current, currentChoice: null } : current))
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

  async function handleInstallApp() {
    if (!deferredInstallPrompt) {
      return
    }

    setIsInstallingApp(true)

    try {
      await deferredInstallPrompt.prompt()
      await deferredInstallPrompt.userChoice
    } finally {
      setDeferredInstallPrompt(null)
      setIsInstallingApp(false)
    }
  }

  function handleDismissInstallPrompt() {
    setIsInstallPromptDismissed(true)
    localStorage.setItem(installDismissKey, 'true')
  }

  const timeUntilNewYearsEve = useMemo(() => {
    const targetTimestamp = getNewYearsEveTimestamp(new Date(now))
    const remainingMs = Math.max(0, targetTimestamp - now)

    const totalSeconds = Math.floor(remainingMs / 1000)
    const days = Math.floor(totalSeconds / (24 * 60 * 60))
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
    const seconds = totalSeconds % 60

    return `${days}d ${hours}h ${minutes}m ${seconds}s`
  }, [now])

  const orderedTasks = useMemo(() => {
    function getTaskPriority(task) {
      if (task.title.trim().toLowerCase() === 'the long game') {
        return 0
      }

      if (task.mandatory) {
        return 1
      }

      if (task.category === 'race') {
        return 2
      }

      if (task.category === 'special') {
        return 3
      }

      if (task.category === 'timed') {
        return 4
      }

      if (task.category === 'common') {
        return 5
      }

      return 6
    }

    return [...tasks].sort((a, b) => {
      const priorityDifference = getTaskPriority(a) - getTaskPriority(b)

      if (priorityDifference !== 0) {
        return priorityDifference
      }

      return (a.displayNumber ?? a.taskNumber) - (b.displayNumber ?? b.taskNumber)
    })
  }, [tasks])

  const taskColumns = useMemo(() => {
    const columnCount = 3
    const itemsPerColumn = Math.ceil(orderedTasks.length / columnCount)

    return Array.from({ length: columnCount }, (_, index) => {
      const start = index * itemsPerColumn
      const end = start + itemsPerColumn
      return orderedTasks.slice(start, end)
    })
  }, [orderedTasks])

  function handleScrollToSubmit() {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    })
  }

  const copy = {
    welcome: 'Welcome',
    welcomeBack: 'Welcome back',
    heroSubtitle: 'Track your progress and keep an eye on the countdown.',
    tasksCompleted: `${completedTaskNumbers.length} tasks completed`,
    submit: 'Submit',
    completedTasks: 'Completed tasks',
    completedTasksHint: 'Tick off the tasks you’ve completed.',
    collapse: 'Collapse completed tasks',
    expand: 'Expand completed tasks',
    loadingTasks: 'Loading task checklist…',
    noTasks: 'No tasks are currently assigned.',
    longGameLoading: 'Loading duel...',
    duePrefix: 'Due',
    submitSectionTitle: 'Submit a new task',
    submitSectionHint: 'You can add photos, videos, or text responses for your tasks.',
    signOut: 'Sign out',
    mandatoryLabel: 'Mandatory task',
    mandatoryInfoTitle: 'Mandatory task',
    mandatoryInfoBody: 'The ! icon means this is a mandatory task and must be completed.',
    raceLabel: 'Race task',
    raceInfoTitle: 'Race task',
    raceInfoBody: 'The checkered flag icon marks this as a race task.',
    specialLabel: 'Special task',
    specialInfoTitle: 'Special task',
    specialInfoBody: 'The star icon marks this as a special task.',
    timedLabel: 'Timed task',
    timedInfoTitle: 'Timed task',
    timedInfoBody: 'The clock icon marks this as a timed task.',
    longGameTitle: 'The Long Game',
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
    close: 'Close',
  }

  const iconInfoCopyByKey = {
    mandatory: {
      title: copy.mandatoryInfoTitle,
      body: copy.mandatoryInfoBody,
    },
    race: {
      title: copy.raceInfoTitle,
      body: copy.raceInfoBody,
    },
    special: {
      title: copy.specialInfoTitle,
      body: copy.specialInfoBody,
    },
    timed: {
      title: copy.timedInfoTitle,
      body: copy.timedInfoBody,
    },
  }

  const activeInfo = activeIconInfo ? iconInfoCopyByKey[activeIconInfo] : null
  const shouldShowLongGameCard = Boolean(
    longGameStatus &&
      longGameStatus.roundStatus === 'active' &&
      !longGameStatus.isBye &&
      longGameStatus.opponent,
  )
  const shouldShowInstallCard = !isAppInstalled && !isInstallPromptDismissed
  const supportsPush =
    typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const shouldShowNotificationCard = notificationPermission !== 'granted'

  return (
    <main className="app-shell">
      <div className="home-layout">
        <section className="hero-panel screen-card" style={{ width: '100%' }}>
          <div className="home-signout-row">
            <button
              className="button-ghost home-signout-icon-button"
              type="button"
              onClick={signOut}
              aria-label={copy.signOut}
              title={copy.signOut}
            >
              <svg
                className="home-signout-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H4" />
              </svg>
            </button>
          </div>

          <div className="title-block">
            <h1>{isFirstVisit ? copy.welcome : copy.welcomeBack}, {user.displayName}</h1>
            <p>{copy.heroSubtitle}</p>
          </div>

          <div className="hero-meta">
            <div className="meta-group">
              <span className="pill">{copy.tasksCompleted}</span>
              <span className="pill">{timeUntilNewYearsEve}</span>
            </div>
            <button className="button hero-submit-button" type="button" onClick={handleScrollToSubmit}>
              {copy.submit}
            </button>
          </div>
        </section>

        {shouldShowNotificationCard ? (
          <section className="panel pwa-install-card" aria-label="Notification permission prompt">
            <h2>Enable notifications</h2>
            {!isAppInstalled && isIosSafari ? (
              <p className="muted">Install to Home Screen first, then enable notifications from inside the app.</p>
            ) : !supportsPush ? (
              <p className="muted">Notifications are not available in this browser mode.</p>
            ) : notificationPermission === 'denied' ? (
              <p className="muted">Notifications are blocked. Open iPhone Settings &gt; Notifications &gt; Tracey Trials and allow them.</p>
            ) : (
              <p className="muted">Tap once to enable push notifications for new tasks.</p>
            )}

            <div className="pwa-install-actions">
              <button
                className="button"
                type="button"
                onClick={handleEnableNotifications}
                disabled={isEnablingNotifications || (!isAppInstalled && isIosSafari)}
              >
                {isEnablingNotifications ? 'Enabling…' : 'Enable notifications'}
              </button>
            </div>

            {notificationMessage ? <p className="muted">{notificationMessage}</p> : null}
          </section>
        ) : null}

        {shouldShowInstallCard ? (
          <section className="panel pwa-install-card" aria-label="Install app prompt">
            <h2>Install the app</h2>

            {deferredInstallPrompt ? (
              <p className="muted">
                Install Tracey Trials for faster access and an app-like experience on your device.
              </p>
            ) : isIosSafari ? (
              <div className="stack pwa-install-ios-wrap">
                <p className="muted">On iPhone/iPad, add it from Safari to use it like an app.</p>
                <ol className="pwa-install-steps">
                  <li>Open this site in Safari.</li>
                  <li>Tap Share.</li>
                  <li>Choose Add to Home Screen.</li>
                </ol>
              </div>
            ) : (
              <div className="stack pwa-install-ios-wrap">
                <p className="muted">
                  Your browser has not exposed the one-tap install button yet. You can install now from the browser menu.
                </p>
                <ol className="pwa-install-steps">
                  <li>Open the browser menu (usually the 3 dots).</li>
                  <li>Choose Install app or Add to Home Screen.</li>
                  <li>Confirm to finish installation.</li>
                </ol>
              </div>
            )}

            <div className="pwa-install-actions">
              {deferredInstallPrompt ? (
                <button
                  className="button"
                  type="button"
                  onClick={handleInstallApp}
                  disabled={isInstallingApp}
                >
                  Install now
                </button>
              ) : null}
              <button className="button-ghost" type="button" onClick={handleDismissInstallPrompt}>
                Not now
              </button>
            </div>
          </section>
        ) : null}

        <section className="panel-grid">
          <article className="panel stack">
            <div className="panel-header tasks-panel-header">
              <div>
                <h2>{copy.completedTasks}</h2>
                <p className="muted">{copy.completedTasksHint}</p>
              </div>
              <button
                className={`button-ghost task-toggle-button${isTaskCardExpanded ? ' is-expanded' : ''}`}
                type="button"
                onClick={() => setIsTaskCardExpanded((current) => !current)}
                aria-expanded={isTaskCardExpanded}
                aria-label={isTaskCardExpanded ? copy.collapse : copy.expand}
                title={isTaskCardExpanded ? copy.collapse : copy.expand}
              >
                <span className="task-toggle-icon" aria-hidden="true">
                  <span className="task-toggle-line task-toggle-line--horizontal" />
                  <span className="task-toggle-line task-toggle-line--vertical" />
                </span>
              </button>
            </div>

            {isTaskCardExpanded ? (
              <>
                {taskError ? <div className="error-banner">{taskError}</div> : null}

                {isTaskListLoading ? (
                  <p className="muted">{copy.loadingTasks}</p>
                ) : tasks.length === 0 ? (
                  <p className="muted">{copy.noTasks}</p>
                ) : (
                  <div className="task-checklist-grid">
                    {taskColumns.map((taskColumn, columnIndex) => (
                      <div key={columnIndex} className="task-checklist-column">
                        {taskColumn.map((task) => {
                          const taskNumber = task.taskNumber
                          const taskDisplayNumber = task.displayNumber ?? task.taskNumber
                          const isCompleted = completedTaskNumbers.includes(taskNumber)
                          const taskTitle = toTitleCase(task.title)
                          const categorySymbol = getCategorySymbol(task.category)
                          const categoryInfoKey = getCategoryInfoKey(task.category)
                          const shouldShowDueDate =
                            task.hasTimeConstraint &&
                            task.deadlineLabel &&
                            ![
                              'eggscessive engineering',
                              'this taskmaster thing is harder than it looks.',
                            ].includes(task.title.trim().toLowerCase())

                          const categoryLabelByKey = {
                            race: copy.raceLabel,
                            special: copy.specialLabel,
                            timed: copy.timedLabel,
                          }

                          return (
                            <div
                              key={taskNumber}
                              className={`task-check-item${isCompleted ? ' task-check-item--completed' : ''}`}
                            >
                              <div className="task-corner-icons">
                                {categorySymbol && categoryInfoKey ? (
                                  <button
                                    className="task-category-icon-button task-category-symbol task-corner-icon"
                                    type="button"
                                    title={categoryLabelByKey[categoryInfoKey]}
                                    aria-label={categoryLabelByKey[categoryInfoKey]}
                                    onClick={() => setActiveIconInfo(categoryInfoKey)}
                                  >
                                    {categorySymbol}
                                  </button>
                                ) : null}
                                {task.mandatory ? (
                                  <button
                                    className="mandatory-corner-icon"
                                    type="button"
                                    title={copy.mandatoryLabel}
                                    aria-label={copy.mandatoryLabel}
                                    onClick={() => setActiveIconInfo('mandatory')}
                                  >
                                    !
                                  </button>
                                ) : null}
                              </div>
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => handleToggleTask(taskNumber)}
                                disabled={isTaskListSaving}
                                aria-label={`Mark ${taskTitle} as completed`}
                              />
                              <Link className="task-check-link task-check-text" to={`/tasks/${taskDisplayNumber}`}>
                                {taskTitle}
                                {shouldShowDueDate ? ` (${copy.duePrefix}: ${task.deadlineLabel})` : ''}
                              </Link>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </article>

          <div className="stack">
            {longGameTask && shouldShowLongGameCard ? (
              <article className="panel stack">
                <div className="panel-header">
                  <div className="long-game-title-wrap">
                    <h2>{copy.longGameTitle}</h2>
                  </div>
                </div>

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
                  ) : (
                    <>
                      <div className="long-game-meta">
                        <div className="long-game-meta-row">
                          <span className="long-game-meta-label">{copy.longGameRoundLabel}</span>
                          <span className="long-game-meta-value">
                            {longGameStatus.roundNumber}
                            {longGameStatus.roundStatus === 'upcoming' ? (
                              <span className="long-game-status-badge long-game-status-badge--upcoming">
                                {copy.longGameStatusUpcoming}
                              </span>
                            ) : longGameStatus.roundStatus === 'closed' ? (
                              <span className="long-game-status-badge long-game-status-badge--closed">
                                {copy.longGameStatusCompleted}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {longGameStatus.endDate ? (
                          <div className="long-game-meta-row">
                            <span className="long-game-meta-label">{copy.longGameCountdownLabel}</span>
                            <span className="long-game-meta-value long-game-countdown">
                              {formatLongGameCountdown(longGameStatus.endDate, now)}
                            </span>
                          </div>
                        ) : null}
                        <div className="long-game-meta-row">
                          <span className="long-game-meta-label">{copy.longGameOpponentLabel}</span>
                          <span className="long-game-meta-value">{longGameStatus.opponent.displayName}</span>
                        </div>
                      </div>

                      {longGameError ? <div className="error-banner">{longGameError}</div> : null}

                      <div className="long-game-choice-prompt">
                        <p className="muted">{copy.longGameChoosePrompt}</p>
                        <div className="long-game-choice-buttons">
                          <button
                            className="button long-game-cooperate-button"
                            type="button"
                            onClick={() => handleConfirmLongGameChoice('cooperate')}
                            disabled={isSavingLongGameChoice}
                          >
                            {copy.cooperate}
                          </button>
                          <button
                            className="button-ghost long-game-betray-button"
                            type="button"
                            onClick={() => handleConfirmLongGameChoice('betray')}
                            disabled={isSavingLongGameChoice}
                          >
                            {copy.betray}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ) : null}

            <article className="panel stack">
              <div className="panel-header">
                <div>
                  <h2>{copy.submitSectionTitle}</h2>
                  <p className="muted">{copy.submitSectionHint}</p>
                </div>
              </div>

              {error ? <div className="error-banner">{error}</div> : null}
              {successMessage ? <div className="success-banner">{successMessage}</div> : null}

              <SubmissionForm
                isSubmitting={isSubmitting}
                onSubmit={handleCreateSubmission}
                availableTasks={tasks}
              />
            </article>
          </div>
        </section>
      </div>

      {activeInfo ? (
        <div className="mandatory-info-backdrop" role="presentation" onClick={() => setActiveIconInfo('')}>
          <div
            className="mandatory-info-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={activeInfo.title}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{activeInfo.title}</h3>
            <p>{activeInfo.body}</p>
            <button className="button-secondary" type="button" onClick={() => setActiveIconInfo('')}>
              {copy.close}
            </button>
          </div>
        </div>
      ) : null}

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

export default HomePage