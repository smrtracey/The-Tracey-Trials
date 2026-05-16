import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import ChangePasswordPage from './pages/ChangePasswordPage'
import HomePage from './pages/HomePage'
import JudgeDashboardPage from './pages/JudgeDashboardPage'
import LoginPage from './pages/LoginPage'
import PlayerDetailsPage from './pages/PlayerDetailsPage'
import PlayerTasksPage from './pages/PlayerTasksPage'
import TaskDetailsPage from './pages/TaskDetailsPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute requirePasswordUpdated allowedRoles={['contestant']}>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/judge"
          element={
            <ProtectedRoute requirePasswordUpdated allowedRoles={['judge']}>
              <JudgeDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/judge/player/:username"
          element={
            <ProtectedRoute requirePasswordUpdated allowedRoles={['judge']}>
              <PlayerDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute requirePasswordUpdated allowedRoles={['contestant']}>
              <PlayerTasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/:taskNumber"
          element={
            <ProtectedRoute requirePasswordUpdated allowedRoles={['contestant']}>
              <TaskDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
