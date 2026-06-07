import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function getDefaultDashboardPath(user) {
  return user?.role === 'judge' ? '/judge' : '/'
}

function ProtectedRoute({ children, requirePasswordUpdated = false, allowedRoles = null }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="app-shell app-shell--centered">
        <section className="screen-card">
          <p className="eyebrow">Checking session</p>
          <div className="title-block">
            <h1>Loading your dashboard…</h1>
            <p>Please allow up to 1 minute for your dashboard to load.</p>
          </div>
        </section>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requirePasswordUpdated && user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultDashboardPath(user)} replace />
  }

  return children
}

export default ProtectedRoute
