import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SubmissionForm from '../components/SubmissionForm'
import { useAuth } from '../hooks/useAuth'
import {
  createSubmission,
  fetchCompletedTasks,
  fetchLongGameStatus,
  saveLongGameChoice,
  updateCompletedTasks,
} from '../lib/api'
import { getStoredLanguage, setStoredLanguage } from '../lib/language'

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
  const [language, setLanguage] = useState(() => getStoredLanguage())
  const [now, setNow] = useState(() => Date.now())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
    setStoredLanguage(language)
  }, [language])

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
      setSuccessMessage(language === 'pt' ? 'Tarefa enviada com sucesso.' : 'Task submitted successfully.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
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

  function handleSignOut() {
    setIsMobileMenuOpen(false)
    signOut()
  }

  function handleChangeLanguage(nextLanguage) {
    setLanguage(nextLanguage)
    setIsMobileMenuOpen(false)
  }

  function handleScrollToSubmit() {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    })
  }

  const copy = {
    welcome: language === 'pt' ? 'Bem-vindo' : 'Welcome',
    welcomeBack: language === 'pt' ? 'Bem-vindo de volta' : 'Welcome back',
    heroSubtitle:
      language === 'pt'
        ? 'Acompanhe seu progresso e fique de olho na contagem regressiva.'
        : 'Track your progress and keep an eye on the countdown.',
    tasksCompleted:
      language === 'pt'
        ? `${completedTaskNumbers.length} tarefas concluídas`
        : `${completedTaskNumbers.length} tasks completed`,
    submit: language === 'pt' ? 'Enviar' : 'Submit',
    completedTasks: language === 'pt' ? 'Tarefas concluídas' : 'Completed tasks',
    completedTasksHint:
      language === 'pt' ? 'Marque as tarefas que você já concluiu.' : 'Tick off the tasks you’ve completed.',
    collapse: language === 'pt' ? 'Recolher tarefas concluídas' : 'Collapse completed tasks',
    expand: language === 'pt' ? 'Expandir tarefas concluídas' : 'Expand completed tasks',
    loadingTasks: language === 'pt' ? 'Carregando lista de tarefas…' : 'Loading task checklist…',
    noTasks: language === 'pt' ? 'Nenhuma tarefa atribuída no momento.' : 'No tasks are currently assigned.',
    longGameLoading: language === 'pt' ? 'Carregando duelo...' : 'Loading duel...',
    duePrefix: language === 'pt' ? 'Prazo' : 'Due',
    submitSectionTitle: language === 'pt' ? 'Enviar nova tarefa' : 'Submit a new task',
    submitSectionHint:
      language === 'pt'
        ? 'Você pode enviar fotos, vídeos ou respostas em texto para suas tarefas.'
        : 'You can add photos, videos, or text responses for your tasks.',
    languageLabel: language === 'pt' ? 'Idioma' : 'Language',
    english: 'English',
    portuguese: 'Português',
    signOut: language === 'pt' ? 'Sair' : 'Sign out',
    openMenu: language === 'pt' ? 'Abrir menu da conta' : 'Open account menu',
    mandatoryLabel: language === 'pt' ? 'Tarefa obrigatoria' : 'Mandatory task',
    mandatoryInfoTitle: language === 'pt' ? 'Tarefa obrigatoria' : 'Mandatory task',
    mandatoryInfoBody:
      language === 'pt'
        ? 'O icone ! indica que esta tarefa e obrigatoria e deve ser concluida.'
        : 'The ! icon means this is a mandatory task and must be completed.',
    raceLabel: language === 'pt' ? 'Tarefa de corrida' : 'Race task',
    raceInfoTitle: language === 'pt' ? 'Tarefa de corrida' : 'Race task',
    raceInfoBody:
      language === 'pt'
        ? 'O icone de bandeira quadriculada indica uma tarefa de corrida.'
        : 'The checkered flag icon marks this as a race task.',
    specialLabel: language === 'pt' ? 'Tarefa especial' : 'Special task',
    specialInfoTitle: language === 'pt' ? 'Tarefa especial' : 'Special task',
    specialInfoBody:
      language === 'pt' ? 'O icone de estrela indica uma tarefa especial.' : 'The star icon marks this as a special task.',
    timedLabel: language === 'pt' ? 'Tarefa com tempo' : 'Timed task',
    timedInfoTitle: language === 'pt' ? 'Tarefa com tempo' : 'Timed task',
    timedInfoBody:
      language === 'pt'
        ? 'O icone de relogio indica que esta tarefa tem limite de tempo.'
        : 'The clock icon marks this as a timed task.',
    longGameTitle: 'The Long Game',
    longGameRoundLabel: language === 'pt' ? 'Rodada' : 'Round',
    longGameCountdownLabel: language === 'pt' ? 'Tempo restante' : 'Time remaining',
    longGameOpponentLabel: language === 'pt' ? 'Adversário' : 'Opponent',
    longGameStatusActive: language === 'pt' ? 'Ativa agora' : 'Active now',
    longGameStatusUpcoming: language === 'pt' ? 'Próxima rodada' : 'Upcoming round',
    longGameStatusCompleted: language === 'pt' ? 'Rodada encerrada' : 'Round closed',
    longGameBye: language === 'pt' ? 'Você está de folga nesta rodada.' : 'You have a bye in this round.',
    longGameMissingOpponent:
      language === 'pt'
        ? 'Não foi possível encontrar seu adversário para esta rodada.'
        : 'Your opponent could not be resolved for this round.',
    cooperate: language === 'pt' ? 'Cooperar' : 'Cooperate',
    betray: language === 'pt' ? 'Trair' : 'Betray',
    longGameYourChoice: language === 'pt' ? 'Sua escolha' : 'Your choice',
    longGameChoosePrompt:
      language === 'pt' ? 'Faça sua escolha' : 'Make your choice',
    longGameConfirmTitle: language === 'pt' ? 'Confirmar escolha' : 'Confirm choice',
    longGameConfirmBody:
      language === 'pt' ? 'Deseja confirmar sua escolha?' : 'Do you want to confirm your choice?',
    confirm: language === 'pt' ? 'Confirmar' : 'Confirm',
    cancel: language === 'pt' ? 'Cancelar' : 'Cancel',
    close: language === 'pt' ? 'Fechar' : 'Close',
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
  const shouldShowInstallCard =
    !isAppInstalled &&
    !isInstallPromptDismissed &&
    (Boolean(deferredInstallPrompt) || isIosSafari)

  return (
    <main className="app-shell">
      <div className="home-layout">
        <section className="hero-panel screen-card" style={{ width: '100%' }}>
          <div className="mobile-menu">
            <button
              className="mobile-menu-toggle"
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-expanded={isMobileMenuOpen}
              aria-label={copy.openMenu}
            >
              <span className="hamburger-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
            {isMobileMenuOpen ? (
              <div className="mobile-menu-dropdown">
                <div className="mobile-menu-label">{copy.languageLabel}</div>
                <button
                  className={`mobile-menu-item${language === 'en' ? ' mobile-menu-item--active' : ''}`}
                  type="button"
                  onClick={() => handleChangeLanguage('en')}
                >
                  {copy.english}
                </button>
                <button
                  className={`mobile-menu-item${language === 'pt' ? ' mobile-menu-item--active' : ''}`}
                  type="button"
                  onClick={() => handleChangeLanguage('pt')}
                >
                  {copy.portuguese}
                </button>
                <button className="mobile-menu-item" type="button" onClick={handleSignOut}>
                  {copy.signOut}
                </button>
              </div>
            ) : null}
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
            <button className="button desktop-signout-button" type="button" onClick={handleScrollToSubmit}>
              {copy.submit}
            </button>
          </div>
        </section>

        {shouldShowInstallCard ? (
          <section className="panel pwa-install-card" aria-label="Install app prompt">
            <h2>{language === 'pt' ? 'Instalar aplicativo' : 'Install the app'}</h2>

            {deferredInstallPrompt ? (
              <p className="muted">
                {language === 'pt'
                  ? 'Instale o Tracey Trials para abrir mais rápido e usar como app no seu dispositivo.'
                  : 'Install Tracey Trials for faster access and an app-like experience on your device.'}
              </p>
            ) : (
              <div className="stack pwa-install-ios-wrap">
                <p className="muted">
                  {language === 'pt'
                    ? 'No iPhone/iPad, adicione pelo Safari para usar como app.'
                    : 'On iPhone/iPad, add it from Safari to use it like an app.'}
                </p>
                <ol className="pwa-install-steps">
                  <li>{language === 'pt' ? 'Abra este site no Safari.' : 'Open this site in Safari.'}</li>
                  <li>{language === 'pt' ? 'Toque em Compartilhar.' : 'Tap Share.'}</li>
                  <li>
                    {language === 'pt'
                      ? 'Escolha Adicionar a Tela de Início.'
                      : 'Choose Add to Home Screen.'}
                  </li>
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
                  {language === 'pt' ? 'Instalar agora' : 'Install now'}
                </button>
              ) : null}
              <button className="button-ghost" type="button" onClick={handleDismissInstallPrompt}>
                {language === 'pt' ? 'Agora não' : 'Not now'}
              </button>
            </div>
          </section>
        ) : null}

        <section className="panel-grid">
          <article className="panel stack">
            <div className="panel-header">
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
                  <p>
                    <strong>{copy.longGameRoundLabel}:</strong> {longGameStatus.roundNumber}
                  </p>
                  <p>
                    <strong>{copy.longGameCountdownLabel}:</strong>{' '}
                    {formatLongGameCountdown(longGameStatus.endDate, now)}
                  </p>
                  <p>
                    <strong>{copy.longGameOpponentLabel}:</strong> {longGameStatus.opponent.displayName}
                  </p>

                  <div className="long-game-choice-block">
                    <p className="long-game-choice-prompt">{copy.longGameChoosePrompt}</p>
                    <div className="long-game-choice-actions">
                      <button
                        className={`button-secondary${longGameStatus.currentChoice === 'cooperate' ? ' long-game-choice-active' : ''}`}
                        type="button"
                        disabled={isSavingLongGameChoice || Boolean(longGameStatus.currentChoice)}
                        onClick={() => handleConfirmLongGameChoice('cooperate')}
                      >
                        {copy.cooperate}
                      </button>
                      <button
                        className={`button-secondary${longGameStatus.currentChoice === 'betray' ? ' long-game-choice-active' : ''}`}
                        type="button"
                        disabled={isSavingLongGameChoice || Boolean(longGameStatus.currentChoice)}
                        onClick={() => handleConfirmLongGameChoice('betray')}
                      >
                        {copy.betray}
                      </button>
                    </div>

                    {longGameStatus.currentChoice ? (
                      <p className="muted">
                        {copy.longGameYourChoice}:{' '}
                        {longGameStatus.currentChoice === 'cooperate' ? copy.cooperate : copy.betray}
                      </p>
                    ) : null}
                  </div>
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
                language={language}
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