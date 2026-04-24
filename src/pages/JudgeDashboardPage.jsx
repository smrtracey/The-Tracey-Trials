import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  fetchJudgeLeaderboard,
  fetchJudgeLongGameRounds,
  fetchJudgeSubmissions,
  fetchJudgeTasks,
} from '../lib/api'

function formatDateTime(value) {
  if (!value) {
    return 'Unknown date'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date'
  }

  return parsed.toLocaleString('en-IE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatChoiceWithPoints(choice, points) {
  if (!choice) {
    return 'Pending'
  }

  const label = choice === 'cooperate' ? 'Cooperate' : 'Betray'

  if (typeof points === 'number') {
    return `${label} (${points} pts)`
  }

  return `${label} (pending points)`
}

function getNextDirection(activeKey, currentDirection, nextKey) {
  if (activeKey !== nextKey) {
    return 'asc'
  }

  return currentDirection === 'asc' ? 'desc' : 'asc'
}

function compareValues(firstValue, secondValue) {
  if (typeof firstValue === 'number' && typeof secondValue === 'number') {
    return firstValue - secondValue
  }

  return String(firstValue).localeCompare(String(secondValue), undefined, { sensitivity: 'base' })
}

function sortRows(rows, sortConfig) {
  const multiplier = sortConfig.direction === 'asc' ? 1 : -1

  return [...rows].sort((first, second) => {
    const firstValue = first[sortConfig.key]
    const secondValue = second[sortConfig.key]

    return compareValues(firstValue, secondValue) * multiplier
  })
}

function JudgeDashboardPage() {
  const { token, signOut } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [tasks, setTasks] = useState([])
  const [longGameRounds, setLongGameRounds] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedContestant, setSelectedContestant] = useState('all')
  const [taskFilter, setTaskFilter] = useState('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [onlyUnresolved, setOnlyUnresolved] = useState(false)
  const [activeContestant, setActiveContestant] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    submissions: true,
    longGame: true,
    leaderboard: true,
  })
  const [submissionSort, setSubmissionSort] = useState({ key: 'createdAtTimestamp', direction: 'desc' })
  const [longGameSort, setLongGameSort] = useState({ key: 'roundNumber', direction: 'desc' })
  const [leaderboardSort, setLeaderboardSort] = useState({ key: 'longGamePoints', direction: 'desc' })

  useEffect(() => {
    let isMounted = true

    async function loadJudgeDashboardData() {
      setError('')
      setIsLoading(true)

      try {
        const [submissionsData, tasksData, longGameData, leaderboardData] = await Promise.all([
          fetchJudgeSubmissions(token),
          fetchJudgeTasks(token),
          fetchJudgeLongGameRounds(token),
          fetchJudgeLeaderboard(token),
        ])

        if (!isMounted) {
          return
        }

        setSubmissions(submissionsData.submissions ?? [])
        setTasks(tasksData.tasks ?? [])
        setLongGameRounds(longGameData.rounds ?? [])
        setLeaderboard(leaderboardData.leaderboard ?? [])
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadJudgeDashboardData()

    return () => {
      isMounted = false
    }
  }, [token])

  const flattenedMatchups = useMemo(
    () =>
      longGameRounds.flatMap((round) =>
        (round.matchups ?? []).map((matchup, matchupIndex) => {
          const [playerA = '', playerB = ''] = matchup.players ?? []
          const choiceA = matchup.choices?.[playerA] ?? null
          const choiceB = matchup.choices?.[playerB] ?? null
          const pointsA = matchup.points?.[playerA] ?? null
          const pointsB = matchup.points?.[playerB] ?? null
          const unresolved = choiceA === null || choiceB === null || pointsA === null || pointsB === null

          return {
            id: `${round.roundNumber}-${playerA}-${playerB}-${matchupIndex}`,
            roundNumber: round.roundNumber,
            startDate: round.startDate,
            endDate: round.endDate,
            playerA,
            playerB,
            choiceA,
            choiceB,
            pointsA,
            pointsB,
            unresolved,
            matchupLabel: `${playerA} vs ${playerB}`,
          }
        }),
      ),
    [longGameRounds],
  )

  const contestants = useMemo(() => {
    const allUsernames = new Set([
      ...submissions.map((submission) => submission.username),
      ...leaderboard.map((entry) => entry.username),
    ])

    return [...allUsernames].sort((first, second) => first.localeCompare(second))
  }, [leaderboard, submissions])

  const availableTaskNumbers = useMemo(() => {
    const values = [...new Set(submissions.map((submission) => submission.taskNumber))]
    return values.sort((first, second) => first - second)
  }, [submissions])

  const taskNameByNumber = useMemo(() => {
    const lookup = new Map()

    for (const task of tasks) {
      lookup.set(task.taskNumber, task.title)
    }

    return lookup
  }, [tasks])

  function getTaskLabel(taskNumber) {
    return taskNameByNumber.get(taskNumber) ?? `Task ${taskNumber}`
  }

  const searchValue = searchFilter.trim().toLowerCase()

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      if (selectedContestant !== 'all' && submission.username !== selectedContestant) {
        return false
      }

      if (taskFilter !== 'all' && submission.taskNumber !== Number(taskFilter)) {
        return false
      }

      if (!searchValue) {
        return true
      }

      const haystack = [
        submission.displayName,
        submission.username,
        getTaskLabel(submission.taskNumber),
        submission.textBody,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchValue)
    })
  }, [searchValue, selectedContestant, submissions, taskFilter, taskNameByNumber])

  const filteredMatchups = useMemo(() => {
    return flattenedMatchups.filter((matchup) => {
      if (selectedContestant !== 'all' && matchup.playerA !== selectedContestant && matchup.playerB !== selectedContestant) {
        return false
      }

      if (onlyUnresolved && !matchup.unresolved) {
        return false
      }

      if (!searchValue) {
        return true
      }

      const haystack = `${matchup.roundNumber} ${matchup.matchupLabel} ${matchup.choiceA ?? ''} ${matchup.choiceB ?? ''}`.toLowerCase()
      return haystack.includes(searchValue)
    })
  }, [flattenedMatchups, onlyUnresolved, searchValue, selectedContestant])

  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((entry) => {
      if (selectedContestant !== 'all' && entry.username !== selectedContestant) {
        return false
      }

      if (!searchValue) {
        return true
      }

      const haystack = `${entry.displayName} ${entry.username} ${entry.longGamePoints}`.toLowerCase()
      return haystack.includes(searchValue)
    })
  }, [leaderboard, searchValue, selectedContestant])

  const submissionRows = useMemo(
    () =>
      sortRows(
        filteredSubmissions.map((submission) => ({
          ...submission,
          createdAtTimestamp: new Date(submission.createdAt).getTime() || 0,
          contestantLabel: `${submission.displayName} (@${submission.username})`,
          hasMedia: submission.mediaType ? 'Yes' : 'No',
          taskLabel: getTaskLabel(submission.taskNumber),
        })),
        submissionSort,
      ),
    [filteredSubmissions, submissionSort, taskNameByNumber],
  )

  const longGameRows = useMemo(
    () =>
      sortRows(
        filteredMatchups.map((matchup) => ({
          ...matchup,
          unresolvedLabel: matchup.unresolved ? 'Unresolved' : 'Resolved',
          totalPoints: (matchup.pointsA ?? 0) + (matchup.pointsB ?? 0),
        })),
        longGameSort,
      ),
    [filteredMatchups, longGameSort],
  )

  const leaderboardRows = useMemo(
    () =>
      sortRows(
        filteredLeaderboard.map((entry) => ({
          ...entry,
          contestantLabel: `${entry.displayName} (@${entry.username})`,
        })),
        leaderboardSort,
      ),
    [filteredLeaderboard, leaderboardSort],
  )

  const activeContestantData = useMemo(() => {
    if (!activeContestant) {
      return null
    }

    const entry = leaderboard.find((row) => row.username === activeContestant) ?? null
    const contestantSubmissions = submissions.filter((submission) => submission.username === activeContestant)
    const contestantMatchups = flattenedMatchups.filter(
      (matchup) => matchup.playerA === activeContestant || matchup.playerB === activeContestant,
    )

    return {
      entry,
      submissions: contestantSubmissions,
      matchups: contestantMatchups,
    }
  }, [activeContestant, flattenedMatchups, leaderboard, submissions])

  function renderSortIndicator(config, columnKey) {
    if (config.key !== columnKey) {
      return '↕'
    }

    return config.direction === 'asc' ? '↑' : '↓'
  }

  function handleToggleSection(sectionKey) {
    setExpandedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }))
  }

  return (
    <main className="app-shell">
      <section className="judge-dashboard-layout">
        <div className="title-block">
          <h1>Mikaela's Dashboard</h1>
          <p>
            Submissions: <strong>{submissionRows.length}</strong> / {submissions.length} | Matchups:{' '}
            <strong>{longGameRows.length}</strong> / {flattenedMatchups.length} | Leaderboard entries:{' '}
            <strong>{leaderboardRows.length}</strong> / {leaderboard.length}
          </p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="task-meta-card judge-filter-bar">
          <div className="field">
            <label htmlFor="judge-filter-contestant">Contestant</label>
            <select
              id="judge-filter-contestant"
              value={selectedContestant}
              onChange={(event) => setSelectedContestant(event.target.value)}
            >
              <option value="all">All contestants</option>
              {contestants.map((username) => (
                <option key={username} value={username}>
                  {username}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="judge-filter-task">Task</label>
            <select id="judge-filter-task" value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}>
              <option value="all">All tasks</option>
              {availableTaskNumbers.map((taskNumber) => (
                <option key={taskNumber} value={String(taskNumber)}>
                  {getTaskLabel(taskNumber)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="judge-filter-search">Search</label>
            <input
              id="judge-filter-search"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              placeholder="Search names, text, round, task"
            />
          </div>

          <label className="judge-toggle">
            <input
              type="checkbox"
              checked={onlyUnresolved}
              onChange={(event) => setOnlyUnresolved(event.target.checked)}
            />
            <span>Only unresolved Long Game rows</span>
          </label>
        </div>

        <div className="judge-dashboard-grid">
          <article className="task-meta-card judge-dashboard-card">
            <div className="judge-section-header">
              <h2>All Submissions</h2>
              <button className="button-ghost judge-collapse-toggle" type="button" onClick={() => handleToggleSection('submissions')}>
                {expandedSections.submissions ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {expandedSections.submissions && isLoading ? <p className="muted">Loading submissions...</p> : null}
            {expandedSections.submissions && !isLoading ? (
              <div className="judge-table-wrap">
                {submissionRows.length === 0 ? (
                  <p className="muted">No submissions found.</p>
                ) : (
                  <table className="judge-table">
                    <thead>
                      <tr>
                        <th>
                          <button
                            className="judge-sort-button"
                            type="button"
                            onClick={() =>
                              setSubmissionSort((current) => ({
                                key: 'createdAtTimestamp',
                                direction: getNextDirection(current.key, current.direction, 'createdAtTimestamp'),
                              }))
                            }
                          >
                            Submitted {renderSortIndicator(submissionSort, 'createdAtTimestamp')}
                          </button>
                        </th>
                        <th>
                          <button
                            className="judge-sort-button"
                            type="button"
                            onClick={() =>
                              setSubmissionSort((current) => ({
                                key: 'contestantLabel',
                                direction: getNextDirection(current.key, current.direction, 'contestantLabel'),
                              }))
                            }
                          >
                            Contestant {renderSortIndicator(submissionSort, 'contestantLabel')}
                          </button>
                        </th>
                        <th>
                          <button
                            className="judge-sort-button"
                            type="button"
                            onClick={() =>
                              setSubmissionSort((current) => ({
                                key: 'taskNumber',
                                direction: getNextDirection(current.key, current.direction, 'taskNumber'),
                              }))
                            }
                          >
                            Task {renderSortIndicator(submissionSort, 'taskNumber')}
                          </button>
                        </th>
                        <th>Media</th>
                        <th>Text</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionRows.map((submission) => (
                        <tr key={submission.id}>
                          <td>{formatDateTime(submission.createdAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="judge-link-button"
                              onClick={() => setActiveContestant(submission.username)}
                            >
                              #{submission.contestantNumber} {submission.displayName}
                            </button>
                          </td>
                          <td>{submission.taskLabel}</td>
                          <td>{submission.hasMedia}</td>
                          <td>{submission.textBody || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
          </article>

          <article className="task-meta-card judge-dashboard-card">
            <div className="judge-section-header">
              <h2>Long Game Overview</h2>
              <button className="button-ghost judge-collapse-toggle" type="button" onClick={() => handleToggleSection('longGame')}>
                {expandedSections.longGame ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {expandedSections.longGame && isLoading ? <p className="muted">Loading long game rounds...</p> : null}
            {expandedSections.longGame && !isLoading ? (
              <div className="judge-table-wrap">
                {longGameRows.length === 0 ? (
                  <p className="muted">No long game choices found.</p>
                ) : (
                  <table className="judge-table">
                    <thead>
                      <tr>
                        <th>
                          <button
                            className="judge-sort-button"
                            type="button"
                            onClick={() =>
                              setLongGameSort((current) => ({
                                key: 'roundNumber',
                                direction: getNextDirection(current.key, current.direction, 'roundNumber'),
                              }))
                            }
                          >
                            Round {renderSortIndicator(longGameSort, 'roundNumber')}
                          </button>
                        </th>
                        <th>Matchup</th>
                        <th>Player A</th>
                        <th>Player B</th>
                        <th>
                          <button
                            className="judge-sort-button"
                            type="button"
                            onClick={() =>
                              setLongGameSort((current) => ({
                                key: 'totalPoints',
                                direction: getNextDirection(current.key, current.direction, 'totalPoints'),
                              }))
                            }
                          >
                            Total pts {renderSortIndicator(longGameSort, 'totalPoints')}
                          </button>
                        </th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {longGameRows.map((matchup) => (
                        <tr key={matchup.id} className={matchup.unresolved ? 'judge-row-unresolved' : ''}>
                          <td>{matchup.roundNumber}</td>
                          <td>{matchup.matchupLabel}</td>
                          <td>
                            <button
                              type="button"
                              className="judge-link-button"
                              onClick={() => setActiveContestant(matchup.playerA)}
                            >
                              {matchup.playerA}
                            </button>
                            <div>{formatChoiceWithPoints(matchup.choiceA, matchup.pointsA)}</div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="judge-link-button"
                              onClick={() => setActiveContestant(matchup.playerB)}
                            >
                              {matchup.playerB}
                            </button>
                            <div>{formatChoiceWithPoints(matchup.choiceB, matchup.pointsB)}</div>
                          </td>
                          <td>{matchup.totalPoints}</td>
                          <td>{matchup.unresolvedLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
          </article>

          <article className="task-meta-card judge-dashboard-card">
            <div className="judge-section-header">
              <h2>Leaderboard</h2>
              <button className="button-ghost judge-collapse-toggle" type="button" onClick={() => handleToggleSection('leaderboard')}>
                {expandedSections.leaderboard ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {expandedSections.leaderboard && isLoading ? <p className="muted">Loading leaderboard...</p> : null}
            {expandedSections.leaderboard && !isLoading ? (
              <div className="judge-table-wrap">
                {leaderboardRows.length === 0 ? (
                  <p className="muted">No leaderboard entries found.</p>
                ) : (
                  <table className="judge-table">
                    <thead>
                      <tr>
                        <th>
                          <button
                            className="judge-sort-button"
                            type="button"
                            onClick={() =>
                              setLeaderboardSort((current) => ({
                                key: 'rank',
                                direction: getNextDirection(current.key, current.direction, 'rank'),
                              }))
                            }
                          >
                            Rank {renderSortIndicator(leaderboardSort, 'rank')}
                          </button>
                        </th>
                        <th>
                          <button
                            className="judge-sort-button"
                            type="button"
                            onClick={() =>
                              setLeaderboardSort((current) => ({
                                key: 'contestantLabel',
                                direction: getNextDirection(current.key, current.direction, 'contestantLabel'),
                              }))
                            }
                          >
                            Contestant {renderSortIndicator(leaderboardSort, 'contestantLabel')}
                          </button>
                        </th>
                        <th>
                          <button
                            className="judge-sort-button"
                            type="button"
                            onClick={() =>
                              setLeaderboardSort((current) => ({
                                key: 'longGamePoints',
                                direction: getNextDirection(current.key, current.direction, 'longGamePoints'),
                              }))
                            }
                          >
                            Points {renderSortIndicator(leaderboardSort, 'longGamePoints')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardRows.map((entry) => (
                        <tr key={entry.username}>
                          <td>{entry.rank}</td>
                          <td>
                            <button
                              type="button"
                              className="judge-link-button"
                              onClick={() => setActiveContestant(entry.username)}
                            >
                              {entry.displayName} (@{entry.username})
                            </button>
                          </td>
                          <td>{entry.longGamePoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
          </article>
        </div>

        <div className="button-row" style={{ justifyContent: 'flex-end' }}>
          <button className="button-ghost" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>

        {activeContestantData ? (
          <div className="judge-side-panel-backdrop" role="presentation" onClick={() => setActiveContestant('')}>
            <aside className="judge-side-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <h2>
                    {activeContestantData.entry?.displayName ?? activeContestant} (@
                    {activeContestantData.entry?.username ?? activeContestant})
                  </h2>
                  <p className="muted">
                    Rank #{activeContestantData.entry?.rank ?? '-'} | Long Game points:{' '}
                    {activeContestantData.entry?.longGamePoints ?? 0}
                  </p>
                </div>
                <button className="button-ghost" type="button" onClick={() => setActiveContestant('')}>
                  Close
                </button>
              </div>

              <div className="judge-side-panel-section">
                <h3>Recent submissions ({activeContestantData.submissions.length})</h3>
                <div className="judge-scroll-area">
                  {activeContestantData.submissions.length === 0 ? (
                    <p className="muted">No submissions found.</p>
                  ) : (
                    <ul className="judge-list">
                      {activeContestantData.submissions.slice(0, 20).map((submission) => (
                        <li key={submission.id} className="judge-list-item">
                          <strong>{getTaskLabel(submission.taskNumber)}</strong>
                          <span>{formatDateTime(submission.createdAt)}</span>
                          <span>{submission.textBody || '-'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="judge-side-panel-section">
                <h3>Long Game history ({activeContestantData.matchups.length})</h3>
                <div className="judge-scroll-area">
                  {activeContestantData.matchups.length === 0 ? (
                    <p className="muted">No rounds found.</p>
                  ) : (
                    <ul className="judge-list">
                      {activeContestantData.matchups.map((matchup) => {
                        const isPlayerA = matchup.playerA === activeContestant
                        const ownChoice = isPlayerA ? matchup.choiceA : matchup.choiceB
                        const ownPoints = isPlayerA ? matchup.pointsA : matchup.pointsB
                        const opponent = isPlayerA ? matchup.playerB : matchup.playerA

                        return (
                          <li key={matchup.id} className={`judge-list-item${matchup.unresolved ? ' judge-row-unresolved' : ''}`}>
                            <strong>Round {matchup.roundNumber}</strong>
                            <span>Opponent: {opponent}</span>
                            <span>Your result: {formatChoiceWithPoints(ownChoice, ownPoints)}</span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default JudgeDashboardPage
