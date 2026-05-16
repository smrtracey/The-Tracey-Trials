import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import FundsRequestCard from '../components/FundsRequestCard'
import SubmissionList from '../components/SubmissionList'
import SubmissionForm from '../components/SubmissionForm'
import { useAuth } from '../hooks/useAuth'
import { subscribeToPushNotifications } from '../lib/push'
import {
  createSubmission,
  fetchCompletedTasks,
  fetchLongGameStatus,
  fetchSubmissions,
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

function getTaskNameByNumber(tasks, taskNumber) {
  const task = tasks.find((entry) => entry.taskNumber === taskNumber)
  return task ? toTitleCase(task.title) : `Task #${taskNumber}`
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

function getStoredBoolean(key) {
  if (typeof localStorage === 'undefined') {
    return false
  }

  return localStorage.getItem(key) === 'true'
}

function setStoredBoolean(key, value) {
  if (typeof localStorage === 'undefined') {
    return
  }

  if (value) {
    localStorage.setItem(key, 'true')
    return
  }

  localStorage.removeItem(key)
}

function getIsIosSafari() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(userAgent)
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|chrome/.test(userAgent)

  return isIos && isSafari
}

function getIsAppInstalled() {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function getScrollContainer(element) {
  if (typeof window === 'undefined') {
    return null
  }

  let current = element?.parentElement ?? null

  while (current) {
    const styles = window.getComputedStyle(current)
    const overflowY = styles.overflowY
    const isScrollable =
      (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight

    if (isScrollable) {
      return current
    }

    current = current.parentElement
  }

  return document.scrollingElement
}

function HomePage() {
  const { token, user, signOut } = useAuth()
  const heroSectionRef = useRef(null)
  const notificationSectionRef = useRef(null)
  const installSectionRef = useRef(null)
  const tasksSectionRef = useRef(null)
  const submitSectionRef = useRef(null)
  const fundsSectionRef = useRef(null)
  const longGameSectionRef = useRef(null)
  const submissionsSectionRef = useRef(null)
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
  const [submissions, setSubmissions] = useState([])
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(true)
  const [submissionsError, setSubmissionsError] = useState('')
  const [longGameStatus, setLongGameStatus] = useState(null)
  const [longGameError, setLongGameError] = useState('')
  const [isLongGameLoading, setIsLongGameLoading] = useState(false)
  const [isSavingLongGameChoice, setIsSavingLongGameChoice] = useState(false)
  const [pendingLongGameChoice, setPendingLongGameChoice] = useState('')
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)
  const [isInstallingApp, setIsInstallingApp] = useState(false)
  const isIosSafari = useMemo(() => getIsIosSafari(), [])
  const [isAppInstalled, setIsAppInstalled] = useState(() => getIsAppInstalled())
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )
  const [notificationMessage, setNotificationMessage] = useState('')
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false)
  const [showScrollTopButton, setShowScrollTopButton] = useState(false)
  const [isTaskCardExpanded, setIsTaskCardExpanded] = useState(() => {
    const key = `tracey-trials-task-card-expanded-${user.id}`
    return localStorage.getItem(key) !== 'false'
  })
  const [isLaptopTaskLayout, setIsLaptopTaskLayout] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia('(min-width: 980px)').matches
  })

  const visitKey = useMemo(() => `tracey-trials-home-visited-${user.id}`, [user.id])
  const installDismissKey = useMemo(() => `tracey-trials-install-dismissed-${user.id}`, [user.id])
  const isFirstVisit = useMemo(() => localStorage.getItem(visitKey) !== 'true', [visitKey])
  const [installPromptDismissState, setInstallPromptDismissState] = useState(() => ({
    key: installDismissKey,
    value: getStoredBoolean(installDismissKey),
  }))
  const isInstallPromptDismissed =
    installPromptDismissState.key === installDismissKey
      ? installPromptDismissState.value
      : getStoredBoolean(installDismissKey)

  const markInstallPromptDismissed = (value) => {
    setStoredBoolean(installDismissKey, value)
    setInstallPromptDismissState({ key: installDismissKey, value })
  }

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
    if (typeof window === 'undefined') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(min-width: 980px)')
    const syncLaptopLayout = (event) => {
      setIsLaptopTaskLayout(event.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncLaptopLayout)

      return () => {
        mediaQuery.removeEventListener('change', syncLaptopLayout)
      }
    }

    mediaQuery.addListener(syncLaptopLayout)

    return () => {
      mediaQuery.removeListener(syncLaptopLayout)
    }
  }, [])

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
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredInstallPrompt(event)
    }

    function handleAppInstalled() {
      setIsAppInstalled(true)
      setDeferredInstallPrompt(null)
      setStoredBoolean(installDismissKey, true)
      setInstallPromptDismissState({ key: installDismissKey, value: true })
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
    if (typeof window === 'undefined') {
      return undefined
    }

    const heroSection = heroSectionRef.current

    if (!heroSection) {
      return undefined
    }

    const scrollContainer = getScrollContainer(heroSection)

    if (!scrollContainer) {
      return undefined
    }

    const readVisibility = () => {
      const heroRect = heroSection.getBoundingClientRect()

      if (scrollContainer === document.scrollingElement) {
        return heroRect.bottom <= 16
      }

      const containerRect = scrollContainer.getBoundingClientRect()
      return heroRect.bottom <= containerRect.top + 16
    }

    const syncScrollTopButton = () => {
      setShowScrollTopButton(readVisibility())
    }

    const handleScroll = () => {
      syncScrollTopButton()
    }

    const frameId = window.requestAnimationFrame(syncScrollTopButton)

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.cancelAnimationFrame(frameId)
      scrollContainer.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
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

  useEffect(() => {
    let isMounted = true

    async function loadSubmissions() {
      try {
        const data = await fetchSubmissions(token)
        if (isMounted) {
          setSubmissions(data.submissions ?? [])
          setSubmissionsError('')
        }
      } catch (loadError) {
        if (isMounted) {
          setSubmissionsError(loadError.message)
        }
      } finally {
        if (isMounted) {
          setIsSubmissionsLoading(false)
        }
      }
    }

    loadSubmissions()

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
      const data = await createSubmission({ token, ...payload })
      if (data?.submission) {
        setSubmissions((current) => [data.submission, ...current])
      }
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
    markInstallPromptDismissed(true)
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

  const sortTasks = useMemo(
    () => (taskList) => {
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

      return [...taskList].sort((a, b) => {
        const priorityDifference = getTaskPriority(a) - getTaskPriority(b)

        if (priorityDifference !== 0) {
          return priorityDifference
        }

        return (a.displayNumber ?? a.taskNumber) - (b.displayNumber ?? b.taskNumber)
      })
    },
    [],
  )

  const coreTasks = useMemo(
    () => sortTasks(tasks.filter((task) => (task.taskSource ?? 'core') !== 'additional')),
    [sortTasks, tasks],
  )

  const additionalTasks = useMemo(
    () => sortTasks(tasks.filter((task) => (task.taskSource ?? 'core') === 'additional')),
    [sortTasks, tasks],
  )

  const buildTaskColumns = useMemo(
    () => (taskList) => {
    const columnCount = 3
      const itemsPerColumn = Math.ceil(taskList.length / columnCount)

      return Array.from({ length: columnCount }, (_, index) => {
        const start = index * itemsPerColumn
        const end = start + itemsPerColumn
        return taskList.slice(start, end)
      })
    },
    [],
  )

  const coreTaskColumns = useMemo(() => buildTaskColumns(coreTasks), [buildTaskColumns, coreTasks])
  const additionalTaskColumns = useMemo(
    () => buildTaskColumns(additionalTasks),
    [additionalTasks, buildTaskColumns],
  )

  function handleScrollToSection(sectionRef) {
    const targetSection = sectionRef.current

    if (!targetSection || typeof window === 'undefined') {
      return
    }

    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }

    const scrollContainer = getScrollContainer(targetSection)

    if (!scrollContainer || scrollContainer === document.scrollingElement) {
      const targetTop = targetSection.getBoundingClientRect().top + window.scrollY - 16

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      })

      return
    }

    const containerRect = scrollContainer.getBoundingClientRect()
    const targetRect = targetSection.getBoundingClientRect()
    const targetTop = targetRect.top - containerRect.top + scrollContainer.scrollTop - 16

    scrollContainer.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    })
  }

  function handleScrollToTop() {
    const heroSection = heroSectionRef.current

    if (!heroSection || typeof window === 'undefined') {
      return
    }

    const scrollContainer = getScrollContainer(heroSection)

    if (!scrollContainer || scrollContainer === document.scrollingElement) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tasksCompletedText =
    completedTaskNumbers.length === 1
      ? '1 task complete'
      : `${completedTaskNumbers.length} tasks completed`

  const iconInfoCopyByKey = {
    mandatory: {
      title: 'Mandatory task',
      body: 'The ! icon means this is a mandatory task and must be completed.',
    },
    race: {
      title: 'Race task',
      body: 'The checkered flag icon marks this as a race task.',
    },
    special: {
      title: 'Special task',
      body: 'The star icon marks this as a special task.',
    },
    timed: {
      title: 'Timed task',
      body: 'The clock icon marks this as a timed task.',
    },
  }

  const activeInfo = activeIconInfo ? iconInfoCopyByKey[activeIconInfo] : null
  const shouldShowInstallCard = !isAppInstalled && !isInstallPromptDismissed
  const supportsPush =
    typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const shouldShowNotificationCard = notificationPermission !== 'granted'
  const shouldShowExpandedTaskCard = isLaptopTaskLayout || isTaskCardExpanded
  const heroSectionLinks = [
    ...(shouldShowNotificationCard
      ? [{ key: 'notifications', label: 'Notifications', ref: notificationSectionRef }]
      : []),
    ...(shouldShowInstallCard ? [{ key: 'install', label: 'Install', ref: installSectionRef }] : []),
    { key: 'tasks', label: 'Tasks', ref: tasksSectionRef },
    { key: 'submit', label: 'Submit', ref: submitSectionRef },
    { key: 'funds', label: 'Funds', ref: fundsSectionRef },
    ...(longGameTask ? [{ key: 'long-game', label: 'Long Game', ref: longGameSectionRef }] : []),
    { key: 'submissions', label: 'Submissions', ref: submissionsSectionRef },
  ]

  function renderTaskChecklist(taskColumns) {
    return (
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

              const categoryLabelByKey = {
                race: 'Race task',
                special: 'Special task',
                timed: 'Timed task',
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
                        title="Mandatory task"
                        aria-label="Mandatory task"
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
                  </Link>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  function renderLongGameCardContent() {
    if (isLongGameLoading && !longGameStatus) {
      return <p className="muted">Loading duel...</p>
    }

    if (!longGameStatus) {
      return longGameError ? <div className="error-banner">{longGameError}</div> : <p className="muted">Loading duel...</p>
    }

    if (longGameStatus.isBye) {
      return (
        <>
          <div className="long-game-meta">
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Round</span>
              <span className="long-game-meta-value">
                {longGameStatus.roundNumber}
                {longGameStatus.roundStatus === 'upcoming' ? (
                  <span className="long-game-status-badge long-game-status-badge--upcoming">Upcoming round</span>
                ) : longGameStatus.roundStatus === 'closed' ? (
                  <span className="long-game-status-badge long-game-status-badge--closed">Round closed</span>
                ) : null}
              </span>
            </div>
            {longGameStatus.endDate ? (
              <div className="long-game-meta-row">
                <span className="long-game-meta-label">Time remaining</span>
                <span className="long-game-meta-value long-game-countdown">
                  {formatLongGameCountdown(longGameStatus.endDate, now)}
                </span>
              </div>
            ) : null}
          </div>
          <p className="muted">You have a bye in this round.</p>
        </>
      )
    }

    if (!longGameStatus.opponent) {
      return (
        <>
          <div className="long-game-meta">
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Round</span>
              <span className="long-game-meta-value">{longGameStatus.roundNumber}</span>
            </div>
          </div>
          {longGameError ? <div className="error-banner">{longGameError}</div> : null}
          <p className="muted">Your opponent could not be resolved for this round.</p>
        </>
      )
    }

    if (longGameStatus.currentChoice) {
      return (
        <>
          <div className="long-game-meta">
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Round</span>
              <span className="long-game-meta-value">
                {longGameStatus.roundNumber}
                {longGameStatus.roundStatus === 'upcoming' ? (
                  <span className="long-game-status-badge long-game-status-badge--upcoming">Upcoming round</span>
                ) : longGameStatus.roundStatus === 'closed' ? (
                  <span className="long-game-status-badge long-game-status-badge--closed">Round closed</span>
                ) : null}
              </span>
            </div>
            {longGameStatus.endDate ? (
              <div className="long-game-meta-row">
                <span className="long-game-meta-label">Time remaining</span>
                <span className="long-game-meta-value long-game-countdown">
                  {formatLongGameCountdown(longGameStatus.endDate, now)}
                </span>
              </div>
            ) : null}
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Opponent</span>
              <span className="long-game-meta-value">{longGameStatus.opponent.displayName}</span>
            </div>
          </div>
          {longGameError ? <div className="error-banner">{longGameError}</div> : null}
          <p className="muted long-game-choice-summary">
            You've chosen to{' '}
            <span className={`long-game-choice-word long-game-choice-word--${longGameStatus.currentChoice}`}>
              {longGameStatus.currentChoice}
            </span>{' '}
            {longGameStatus.currentChoice === 'cooperate' ? 'with ' : ''}
            {longGameStatus.opponent.displayName}
          </p>
        </>
      )
    }

    if (longGameStatus.roundStatus === 'upcoming') {
      return (
        <>
          <div className="long-game-meta">
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Round</span>
              <span className="long-game-meta-value">
                {longGameStatus.roundNumber}
                <span className="long-game-status-badge long-game-status-badge--upcoming">Upcoming round</span>
              </span>
            </div>
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Opponent</span>
              <span className="long-game-meta-value">{longGameStatus.opponent.displayName}</span>
            </div>
          </div>
          {longGameError ? <div className="error-banner">{longGameError}</div> : null}
          <p className="muted">This round has not opened yet.</p>
        </>
      )
    }

    if (longGameStatus.roundStatus === 'closed') {
      return (
        <>
          <div className="long-game-meta">
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Round</span>
              <span className="long-game-meta-value">
                {longGameStatus.roundNumber}
                <span className="long-game-status-badge long-game-status-badge--closed">Round closed</span>
              </span>
            </div>
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Opponent</span>
              <span className="long-game-meta-value">{longGameStatus.opponent.displayName}</span>
            </div>
          </div>
          {longGameError ? <div className="error-banner">{longGameError}</div> : null}
          <p className="muted">This round is over.</p>
        </>
      )
    }

    return (
      <>
        <div className="long-game-meta">
          <div className="long-game-meta-row">
            <span className="long-game-meta-label">Round</span>
            <span className="long-game-meta-value">{longGameStatus.roundNumber}</span>
          </div>
          {longGameStatus.endDate ? (
            <div className="long-game-meta-row">
              <span className="long-game-meta-label">Time remaining</span>
              <span className="long-game-meta-value long-game-countdown">
                {formatLongGameCountdown(longGameStatus.endDate, now)}
              </span>
            </div>
          ) : null}
          <div className="long-game-meta-row">
            <span className="long-game-meta-label">Opponent</span>
            <span className="long-game-meta-value">{longGameStatus.opponent.displayName}</span>
          </div>
        </div>

        {longGameError ? <div className="error-banner">{longGameError}</div> : null}

        <div className="long-game-choice-prompt">
          <p className="muted">Make your choice</p>
          <div className="long-game-choice-buttons">
            <button
              className="button long-game-cooperate-button"
              type="button"
              onClick={() => handleConfirmLongGameChoice('cooperate')}
              disabled={isSavingLongGameChoice}
            >
              Cooperate
            </button>
            <button
              className="button-ghost long-game-betray-button"
              type="button"
              onClick={() => handleConfirmLongGameChoice('betray')}
              disabled={isSavingLongGameChoice}
            >
              Betray
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <main className="app-shell">
      <div className="home-layout">
        <section className="hero-panel screen-card" style={{ width: '100%' }} ref={heroSectionRef}>
          <div className="home-signout-row">
            <button
              className="button-ghost home-signout-icon-button"
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
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
            <h1>{isFirstVisit ? 'Welcome' : 'Welcome back'}, {user.displayName}</h1>
            <p>Track your progress and keep an eye on the countdown.</p>
          </div>

          <div className="hero-meta">
            <div className="meta-group">
              <span className="pill">{tasksCompletedText}</span>
              <span className="pill">{timeUntilNewYearsEve}</span>
            </div>
          </div>

          <nav className="hero-section-links" aria-label="Homepage sections">
            {heroSectionLinks.map((section) => (
              <button
                key={section.key}
                className="button-ghost hero-section-link"
                type="button"
                onClick={() => handleScrollToSection(section.ref)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </section>

        {shouldShowNotificationCard ? (
          <section className="panel pwa-install-card" aria-label="Notification permission prompt" ref={notificationSectionRef}>
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
          <section className="panel pwa-install-card" aria-label="Install app prompt" ref={installSectionRef}>
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

        <section className="panel-grid player-dashboard-grid">
          <article className="panel stack player-dashboard-card player-dashboard-card--tasks" ref={tasksSectionRef}>
            <div className={`panel-header tasks-panel-header${isLaptopTaskLayout ? ' tasks-panel-header--static' : ''}`}>
              <div>
                <h2>Tasks</h2>
                <p className="muted">Here you can see what tasks are available and mark them as completed.</p>
              </div>
              {isLaptopTaskLayout ? null : (
                <button
                  className={`button-ghost task-toggle-button${isTaskCardExpanded ? ' is-expanded' : ''}`}
                  type="button"
                  onClick={() => setIsTaskCardExpanded((current) => !current)}
                  aria-expanded={isTaskCardExpanded}
                  aria-label={isTaskCardExpanded ? 'Collapse completed tasks' : 'Expand completed tasks'}
                  title={isTaskCardExpanded ? 'Collapse completed tasks' : 'Expand completed tasks'}
                >
                  <span className="task-toggle-icon" aria-hidden="true">
                    <span className="task-toggle-line task-toggle-line--horizontal" />
                    <span className="task-toggle-line task-toggle-line--vertical" />
                  </span>
                </button>
              )}
            </div>

            {shouldShowExpandedTaskCard ? (
              <>
                {taskError ? <div className="error-banner">{taskError}</div> : null}

                {isTaskListLoading ? (
                  <p className="muted">Loading task checklist…</p>
                ) : tasks.length === 0 ? (
                  <p className="muted">No tasks are currently assigned.</p>
                ) : (
                  <div className="task-sections">
                    {coreTasks.length > 0 ? (
                      <section className="task-section-block">
                        <div className="task-section-header">
                          <h3>Main tasks</h3>
                        </div>
                        {renderTaskChecklist(coreTaskColumns)}
                      </section>
                    ) : null}

                    <section className="task-section-block task-section-block--additional">
                      <div className="task-section-header">
                        <div>
                          <h3>Additional tasks</h3>
                          <p className="muted">Tasks added by the judge will appear here.</p>
                        </div>
                      </div>

                      {additionalTasks.length > 0 ? (
                        renderTaskChecklist(additionalTaskColumns)
                      ) : (
                        <p className="muted">No additional tasks yet.</p>
                      )}
                    </section>
                  </div>
                )}
              </>
            ) : null}
          </article>

          <article className="panel stack player-dashboard-card player-dashboard-card--submit" ref={submitSectionRef}>
            <div className="panel-header">
              <div>
                <h2>Submit a new task</h2>
                <p className="muted">You can add photos, videos, or text responses for your tasks.</p>
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

          <div className="player-dashboard-card player-dashboard-card--funds" ref={fundsSectionRef}>
            <FundsRequestCard token={token} />
          </div>

          {longGameTask ? (
            <article className="panel stack player-dashboard-card player-dashboard-card--long-game" ref={longGameSectionRef}>
              <div className="panel-header">
                <div className="long-game-title-wrap">
                  <h2>The Long Game</h2>
                </div>
              </div>

              <div className="long-game-content">{renderLongGameCardContent()}</div>
            </article>
          ) : null}

          <article className="panel stack player-dashboard-card player-dashboard-card--submissions" ref={submissionsSectionRef}>
            <div className="panel-header">
              <div>
                <h2>My Submissions</h2>
                <p className="muted">View all the tasks you have submitted so far.</p>
              </div>
            </div>

            {isSubmissionsLoading ? <p className="muted">Loading your submissions…</p> : null}
            {submissionsError ? <div className="error-banner">{submissionsError}</div> : null}
            {!isSubmissionsLoading && !submissionsError ? (
              <SubmissionList
                submissions={submissions}
                getTaskName={(taskNumber) => getTaskNameByNumber(tasks, taskNumber)}
              />
            ) : null}
          </article>
        </section>
      </div>

      {showScrollTopButton ? (
        <button
          className="button scroll-to-top-button"
          type="button"
          onClick={handleScrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <svg
            className="scroll-to-top-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      ) : null}

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
              Close
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
            aria-label="Confirm choice"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Confirm choice</h3>
            <p>
                Do you want to confirm your choice?{' '}
                <strong>{pendingLongGameChoice === 'cooperate' ? 'Cooperate' : 'Betray'}</strong>
            </p>
            <div className="mandatory-info-actions">
              <button className="button-ghost" type="button" onClick={handleCancelLongGameChoice}>
                  Cancel
              </button>
              <button className="button-secondary" type="button" onClick={handleApproveLongGameChoice}>
                  Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default HomePage