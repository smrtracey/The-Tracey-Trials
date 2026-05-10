import { useEffect, useMemo, useState } from 'react'
import { createFundRequest, fetchFundRequests } from '../lib/api'

const PLAYER_BUDGET = 100

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRequestTimestamp(value) {
  return new Date(value).toLocaleString('en-IE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FundsRequestCard({ token }) {
  const [requestedAmount, setRequestedAmount] = useState('')
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadRequests() {
      try {
        const data = await fetchFundRequests(token)
        if (isMounted) {
          setRequests(data.requests ?? [])
          setError('')
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoadingRequests(false)
        }
      }
    }

    loadRequests()

    return () => {
      isMounted = false
    }
  }, [token])

  const spent = useMemo(
    () => requests.filter((request) => request.status === 'paid').reduce((sum, request) => sum + request.amount, 0),
    [requests],
  )

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests],
  )

  const remaining = PLAYER_BUDGET - spent

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedAmount = Number.parseInt(requestedAmount, 10)

    setError('')
    setSuccessMessage('')

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError('Enter a valid amount in euro.')
      return
    }

    if (normalizedAmount > remaining) {
      setError(`You only have ${formatCurrency(remaining)} remaining.`)
      return
    }

    setIsSubmittingRequest(true)

    try {
      const data = await createFundRequest(token, normalizedAmount)
      setRequests((currentRequests) => [data.request, ...currentRequests])
      setRequestedAmount('')
      setSuccessMessage('Request submitted to the judge.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  return (
    <article className="panel stack funds-request-card-player">
      <div className="panel-header">
        <div>
          <h2>Request Funds</h2>
          <p className="muted">You have {formatCurrency(PLAYER_BUDGET)} to use across the competition.</p>
        </div>
      </div>

      <div className="funds-player-summary">
        <span className="pill">Spent: {formatCurrency(spent)}</span>
        <span className="pill">Remaining: {formatCurrency(remaining)}</span>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {successMessage ? <div className="success-banner">{successMessage}</div> : null}

      <form className="funds-player-form" onSubmit={handleSubmit}>
        <label className="field" htmlFor="fund-request-amount">
          <span>Amount requested</span>
          <input
            id="fund-request-amount"
            inputMode="numeric"
            min="1"
            max={remaining}
            placeholder="e.g. 15"
            value={requestedAmount}
            onChange={(event) => setRequestedAmount(event.target.value)}
          />
        </label>
        <button className="button" type="submit" disabled={remaining <= 0 || isSubmittingRequest || isLoadingRequests}>
          {isSubmittingRequest ? 'Sending…' : 'Send request'}
        </button>
      </form>

      <div className="funds-player-history">
        <div className="panel-header">
          <div>
            <h3>Pending requests</h3>
          </div>
        </div>

        {isLoadingRequests ? (
          <p className="muted">Loading requests…</p>
        ) : pendingRequests.length === 0 ? (
          <p className="muted">No pending requests.</p>
        ) : (
          <ul className="funds-player-request-list">
            {pendingRequests.map((request) => (
              <li key={request.id} className="funds-player-request-item">
                <strong>{formatCurrency(request.amount)}</strong>
                <span>{formatRequestTimestamp(request.requestedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}