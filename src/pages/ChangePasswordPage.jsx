import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { changePassword } from '../lib/api'

function getDefaultDashboardPath(user) {
  return user?.role === 'judge' ? '/judge' : '/'
}

function ChangePasswordPage() {
  const navigate = useNavigate()
  const { token, user, updateUser, signOut } = useAuth()
  const [formState, setFormState] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!user?.mustChangePassword) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const data = await changePassword({ token, ...formState })
      updateUser(data.user)
      setSuccess('Password updated. Redirecting to your dashboard...')
      setTimeout(() => {
        navigate(getDefaultDashboardPath(data.user), { replace: true })
      }, 700)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBackToLogin() {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main className="app-shell app-shell--centered">
      <section className="screen-card">
        <div className="title-block login-title-block">
          <h1 className="fun-title">Set your new password</h1>
          <p>This is required once before you can access submissions.</p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={formState.newPassword}
              onChange={(event) =>
                setFormState((current) => ({ ...current, newPassword: event.target.value }))
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={formState.confirmPassword}
              onChange={(event) =>
                setFormState((current) => ({ ...current, confirmPassword: event.target.value }))
              }
              required
            />
          </div>

          <div className="button-row login-submit-row" style={{ justifyContent: 'center' }}>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save new password'}
            </button>
            <button className="button-ghost" type="button" onClick={handleBackToLogin}>
              Back to login
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default ChangePasswordPage
