import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PlayerPrimaryNav from '../components/PlayerPrimaryNav'
import { useAuth } from '../hooks/useAuth'
import { fetchCompletedTasks, updateCompletedTasks, updateTaskPin } from '../lib/api'

const TASK_TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'standard', label: 'Standard' },
  { value: 'social', label: 'Social' },
  { value: 'physical', label: 'Physical' },
  { value: 'race', label: 'Race' },
  { value: 'team', label: 'Team' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'fetch quest', label: 'Fetch quest' },
  { value: 'goPro', label: 'GoPro' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'just for you', label: 'Just for you' },
]

const TASK_STATUS_FILTERS = [
  { value: 'all', label: 'All tasks' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'completed', label: 'Completed' },
]

function getTaskTypes(task) {
  if (Array.isArray(task.taskTypes) && task.taskTypes.length > 0) {
    return task.taskTypes
  }

  return [task.category ?? 'common']
}

function getDisplayTaskTypes(task) {
  return getTaskTypes(task).map((type) =>
    type === 'autocomplete' || type === 'recurring' || type === 'common'
      ? 'standard'
      : type === 'timed'
        ? 'deadline'
        : type,
  )
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

function isTaskCompleted(task, completedTaskNumbers) {
  return !isRecurringTask(task) && completedTaskNumbers.includes(task.taskNumber)
}

function isTaskCompletionLocked(task, completedTaskNumbers) {
  return isOneWayCompletionTask(task) && isTaskCompleted(task, completedTaskNumbers)
}

function hasTaskType(task, type) {
  return getDisplayTaskTypes(task).includes(type)
}

function formatTaskTypes(task) {
  return [...new Set(getDisplayTaskTypes(task))].join(', ')
}

function toTitleCase(value) {
  return value
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
}

function matchesTaskTypeFilter(task, filterValue) {
  if (filterValue === 'all') {
    return true
  }

  if (filterValue === 'standard') {
    return hasTaskType(task, 'standard')
  }

  if (filterValue === 'team') {
    return hasTaskType(task, 'team')
  }

  if (filterValue === 'deadline') {
    return hasTaskType(task, 'deadline')
  }

  return hasTaskType(task, filterValue)
}

function PlayerTasksPage() {
  const { token, signOut } = useAuth()
  const [selectedTaskType, setSelectedTaskType] = useState('all')
  const [selectedTaskStatus, setSelectedTaskStatus] = useState('all')
  const [isMainTasksExpanded, setIsMainTasksExpanded] = useState(true)
  const [isAdditionalTasksExpanded, setIsAdditionalTasksExpanded] = useState(false)
  const [tasks, setTasks] = useState([])
  const [completedTaskNumbers, setCompletedTaskNumbers] = useState([])
  const [pinnedTaskNumbers, setPinnedTaskNumbers] = useState([])
  const [isTaskListLoading, setIsTaskListLoading] = useState(true)
  const [isTaskListSaving, setIsTaskListSaving] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [showScrollTopButton, setShowScrollTopButton] = useState(false)

  const availableTaskTypeFilters = useMemo(() => {
    const availableTypes = new Set(tasks.flatMap((task) => getDisplayTaskTypes(task)))

    return TASK_TYPE_FILTERS.filter((filterOption) => {
      if (filterOption.value === 'all' || filterOption.value === 'standard') {
        return true
      }

      if (filterOption.value === 'just for you') {
        return availableTypes.has('just for you')
      }

      return true
    })
  }, [tasks])

  useEffect(() => {
    let isMounted = true

    async function loadCompletedTasks() {
      try {
        const data = await fetchCompletedTasks(token)

        if (isMounted) {
          setCompletedTaskNumbers(data.completedTaskNumbers)
          setPinnedTaskNumbers(data.pinnedTaskNumbers ?? [])
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
    const isSelectedFilterAvailable = availableTaskTypeFilters.some(
      (filterOption) => filterOption.value === selectedTaskType,
    )

    if (!isSelectedFilterAvailable) {
      setSelectedTaskType('all')
    }
  }, [availableTaskTypeFilters, selectedTaskType])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const scrollContainer = document.getElementById('root')

    if (!scrollContainer) {
      return undefined
    }

    const syncScrollTopButton = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
      setShowScrollTopButton(scrollContainer.scrollTop >= viewportHeight)
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

  async function handleToggleTask(taskNumber) {
    const task = tasks.find((entry) => entry.taskNumber === taskNumber)

    if (task && (isRecurringTask(task) || isTaskCompletionLocked(task, completedTaskNumbers))) {
      return
    }

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

  async function handleToggleTaskPin(taskNumber) {
    const isPinned = pinnedTaskNumbers.includes(taskNumber)
    const nextPinned = isPinned
      ? pinnedTaskNumbers.filter((value) => value !== taskNumber)
      : [...pinnedTaskNumbers, taskNumber].sort((a, b) => a - b)

    setPinnedTaskNumbers(nextPinned)
    setTaskError('')

    try {
      const data = await updateTaskPin(token, taskNumber, !isPinned)
      setPinnedTaskNumbers(data.pinnedTaskNumbers ?? nextPinned)
    } catch (saveError) {
      setPinnedTaskNumbers(pinnedTaskNumbers)
      setTaskError(saveError.message)
    }
  }

  const sortTasks = useMemo(
    () => (taskList) => {
      function getTaskPriority(task) {
        const taskTypes = getTaskTypes(task)

        if (task.title.trim().toLowerCase() === 'the long game') {
          return 0
        }

        if (task.mandatory) {
          return 1
        }

        if (taskTypes.includes('race')) {
          return 2
        }

        if (taskTypes.includes('team')) {
          return 3
        }

        if (taskTypes.includes('timed')) {
          return 4
        }

        if (taskTypes.includes('common')) {
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

  const filteredTasks = useMemo(
    () =>
      sortTasks(
        tasks.filter((task) => {
          if (!matchesTaskTypeFilter(task, selectedTaskType)) {
            return false
          }

          const isCompleted = isTaskCompleted(task, completedTaskNumbers)

          if (selectedTaskStatus === 'completed' && !isCompleted) {
            return false
          }

          if (selectedTaskStatus === 'incomplete' && isCompleted) {
            return false
          }

          return true
        }),
      ),
    [completedTaskNumbers, selectedTaskStatus, selectedTaskType, sortTasks, tasks],
  )

  const coreTasks = useMemo(
    () => filteredTasks.filter((task) => (task.taskSource ?? 'core') !== 'additional'),
    [filteredTasks],
  )

  const additionalTasks = useMemo(
    () => filteredTasks.filter((task) => (task.taskSource ?? 'core') === 'additional'),
    [filteredTasks],
  )

  const completedCount = tasks.filter((task) => isTaskCompleted(task, completedTaskNumbers)).length
  const completableTaskCount = tasks.filter((task) => !isRecurringTask(task)).length
  const remainingCount = Math.max(0, completableTaskCount - completedCount)
  const filteredCount = filteredTasks.length

  function handleScrollToTop() {
    if (typeof window === 'undefined') {
      return
    }

    const scrollContainer = document.getElementById('root')

    if (!scrollContainer) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function renderTaskList(taskList) {
    return (
      <div className="player-tasks-list">
        {taskList.map((task) => {
          const taskNumber = task.taskNumber
          const taskDisplayNumber = task.displayNumber ?? task.taskNumber
          const isRecurring = isRecurringTask(task)
          const isCompleted = isTaskCompleted(task, completedTaskNumbers)
          const isCompletionLocked = isTaskCompletionLocked(task, completedTaskNumbers)
          const isPinned = pinnedTaskNumbers.includes(taskNumber)
          const taskTitle = toTitleCase(task.title)
          const taskTypeText = formatTaskTypes(task)

          return (
            <div
              key={taskNumber}
              className={`task-check-item${isCompleted ? ' task-check-item--completed' : ''}${isCompletionLocked && isCompleted ? ' task-check-item--locked-complete' : ''}`}
            >
              <button
                className={`task-pin-button${isPinned ? ' task-pin-button--active' : ''}`}
                type="button"
                onClick={() => handleToggleTaskPin(taskNumber)}
                aria-label={isPinned ? `Unpin ${taskTitle}` : `Pin ${taskTitle}`}
                aria-pressed={isPinned}
                title={isPinned ? 'Unpin task' : 'Pin task'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 17v5" />
                  <path d="M8 10V4.5a4 4 0 1 1 8 0V10" />
                  <path d="M6 10h12" />
                  <path d="M7 10c0 3.3 2.2 6 5 6s5-2.7 5-6" />
                </svg>
              </button>

              {isRecurring ? (
                <span className="task-repeat-indicator" role="img" aria-label={`${taskTitle} repeats`} title="Recurring task">
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
                </span>
              ) : (
                <input
                  className={isCompletionLocked && isCompleted ? 'task-checkbox--locked-complete' : ''}
                  type="checkbox"
                  checked={isCompleted}
                  onChange={() => handleToggleTask(taskNumber)}
                  disabled={isTaskListSaving}
                  aria-disabled={isCompletionLocked}
                  aria-label={`Mark ${taskTitle} as completed`}
                  title={isCompletionLocked ? 'This task stays completed once finished.' : undefined}
                />
              )}

              <div className="task-check-content">
                <Link className="task-check-link task-check-text" to={`/tasks/${taskDisplayNumber}`}>
                  {taskTitle}
                </Link>
                <span className="task-check-type-text">{taskTypeText}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderTaskSection({ title, description, taskList, isExpanded, onToggle, emptyCopy }) {
    return (
      <section className="task-section-block task-section-block--collapsible">
        <button
          className="submission-group-toggle player-task-section-toggle"
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <span className="submission-group-heading">
            <span className="player-task-section-title-row">
              <span>{title}</span>
              <span className="player-task-section-count">{taskList.length}</span>
            </span>
            {description ? <span className="muted">{description}</span> : null}
          </span>
          <span className="submission-group-chevron" aria-hidden="true">
            {isExpanded ? '−' : '+'}
          </span>
        </button>

        {isExpanded ? (taskList.length > 0 ? renderTaskList(taskList) : <p className="muted">{emptyCopy}</p>) : null}
      </section>
    )
  }

  return (
    <main className="app-shell app-shell--player">
      <div className="player-tasks-layout">
        <article className="panel stack player-tasks-panel">
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

          <div className="panel-header player-tasks-panel-header">
            <div>
              <h1>Your Tasks</h1>
            </div>
            <div className="player-tasks-summary-pills">
              <span className="pill">{completedCount} completed</span>
              <span className="pill">{remainingCount} remaining</span>
            </div>
          </div>

          <div className="player-tasks-toolbar">
            <div className="player-tasks-filter-row">
              <label className="field player-tasks-compact-filter">
                <span className="player-tasks-toolbar-label">Type</span>
                <select value={selectedTaskType} onChange={(event) => setSelectedTaskType(event.target.value)}>
                  {availableTaskTypeFilters.map((filterOption) => (
                    <option key={filterOption.value} value={filterOption.value}>
                      {filterOption.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field player-tasks-compact-filter">
                <span className="player-tasks-toolbar-label">Status</span>
                <select value={selectedTaskStatus} onChange={(event) => setSelectedTaskStatus(event.target.value)}>
                  {TASK_STATUS_FILTERS.map((filterOption) => (
                    <option key={filterOption.value} value={filterOption.value}>
                      {filterOption.label}
                    </option>
                  ))}
                </select>
              </label>

            </div>

            <p className="muted player-tasks-results-copy">
              {filteredCount === tasks.length ? `${filteredCount} tasks` : `${filteredCount} of ${tasks.length} tasks`}
            </p>
          </div>

          {taskError ? <div className="error-banner">{taskError}</div> : null}

          {isTaskListLoading ? (
            <p className="muted">Loading task checklist…</p>
          ) : tasks.length === 0 ? (
            <p className="muted">No tasks are currently assigned.</p>
          ) : filteredTasks.length === 0 ? (
            <p className="muted">No tasks match those filters.</p>
          ) : (
            <div className="task-sections">
              {renderTaskSection({
                title: 'Main tasks',
                description: '',
                taskList: coreTasks,
                isExpanded: isMainTasksExpanded,
                onToggle: () => setIsMainTasksExpanded((current) => !current),
                emptyCopy: 'No main tasks match this filter.',
              })}

              {renderTaskSection({
                title: 'Additional tasks',
                description: 'Tasks added by the judge will appear here.',
                taskList: additionalTasks,
                isExpanded: isAdditionalTasksExpanded,
                onToggle: () => setIsAdditionalTasksExpanded((current) => !current),
                emptyCopy: 'No additional tasks match this filter.',
              })}
            </div>
          )}
        </article>
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

      <PlayerPrimaryNav />
    </main>
  )
}

export default PlayerTasksPage