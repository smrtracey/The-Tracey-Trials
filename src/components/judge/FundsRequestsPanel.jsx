import { useEffect, useMemo, useState } from 'react'
import { fetchJudgeFundRequests, updateJudgeFundRequestStatus } from '../../lib/api'

const PLAYER_STARTING_BALANCE = 100;

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  return new Date(value).toLocaleString('en-IE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FundsRequestsPanel({ leaderboardRows, isLoading, token }) {
  const [fundRequests, setFundRequests] = useState([])
  const [isFundsLoading, setIsFundsLoading] = useState(true)
  const [fundsError, setFundsError] = useState('')
  const [updatingRequestId, setUpdatingRequestId] = useState('')
  const paidStatuses = new Set(['paid']);

  useEffect(() => {
    let isMounted = true

    async function loadFundRequests() {
      try {
        const data = await fetchJudgeFundRequests(token)
        if (isMounted) {
          setFundRequests(data.requests ?? [])
          setFundsError('')
        }
      } catch (requestError) {
        if (isMounted) {
          setFundsError(requestError.message)
        }
      } finally {
        if (isMounted) {
          setIsFundsLoading(false)
        }
      }
    }

    loadFundRequests()

    return () => {
      isMounted = false
    }
  }, [token])

  async function handleMarkAsDone(requestId) {
    setUpdatingRequestId(requestId)

    try {
      const data = await updateJudgeFundRequestStatus(token, requestId, 'paid')
      setFundRequests((currentRequests) =>
        currentRequests.map((request) => (request.id === requestId ? data.request : request)),
      )
      setFundsError('')
    } catch (requestError) {
      setFundsError(requestError.message)
    } finally {
      setUpdatingRequestId('')
    }
  }

  const playerRows = useMemo(
    () =>
      leaderboardRows
        .map((entry) => {
          const requests = fundRequests.filter((request) => request.username === entry.username)
          const borrowed = requests
            .filter((request) => paidStatuses.has(request.status))
            .reduce((sum, request) => sum + request.amount, 0)
          const pending = requests.filter((request) => request.status === 'pending')

          return {
            ...entry,
            borrowed,
            remaining: PLAYER_STARTING_BALANCE - borrowed,
            pendingCount: pending.length,
          }
        })
        .sort((first, second) => first.displayName.localeCompare(second.displayName)),
    [fundRequests, leaderboardRows],
  )

  const pendingRequests = useMemo(
    () =>
      fundRequests
        .filter((request) => request.status === 'pending')
        .sort((first, second) => new Date(second.requestedAt) - new Date(first.requestedAt)),
    [fundRequests],
  )

  const showLoadingState = isLoading || isFundsLoading

  return (
    <article className="task-meta-card judge-dashboard-card funds-panel-card">
      <div className="judge-section-header">
        <h2>Funds Requests</h2>
        <span className={`funds-pill${pendingRequests.length === 0 ? ' is-clear' : ''}`}>
          {pendingRequests.length} pending
        </span>
      </div>

      {showLoadingState ? <p className="muted">Loading fund requests...</p> : null}
      {!showLoadingState && fundsError ? <div className="error-banner">{fundsError}</div> : null}

      {!showLoadingState ? (
        <div className="funds-panel-layout">
          <div className="judge-table-wrap">
            {playerRows.length === 0 ? (
              <p className="muted">No contestants available.</p>
            ) : (
              <table className="judge-table">
                <thead>
                  <tr>
                    <th>Contestant</th>
                    <th>Spent</th>
                    <th>Remaining</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {playerRows.map((entry) => (
                    <tr key={entry.username}>
                      <td>{entry.displayName}</td>
                      <td>{formatCurrency(entry.borrowed)}</td>
                      <td>{formatCurrency(entry.remaining)}</td>
                      <td>{entry.pendingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="funds-requests-list">
            <h3>Pending Requests</h3>
            {pendingRequests.length === 0 ? (
              <p className="muted">No pending requests.</p>
            ) : (
              <ul className="funds-request-items">
                {pendingRequests.map((request) => (
                  <li key={request.id} className="funds-request-item">
                    <div className="funds-request-main">
                      <strong>{request.displayName}</strong>
                      <button
                        type="button"
                        className="funds-request-button"
                        onClick={() => handleMarkAsDone(request.id)}
                        disabled={updatingRequestId === request.id}
                      >
                        {updatingRequestId === request.id ? 'Saving…' : 'Done'}
                      </button>
                    </div>
                    <div className="funds-request-meta">
                      <strong>{formatCurrency(request.amount)}</strong>
                      <span>{formatDate(request.requestedAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}