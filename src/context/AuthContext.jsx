import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { fetchCurrentUser, loginUser } from '../lib/api'

const TOKEN_STORAGE_KEY = 'tracey-trials-token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      if (!token) {
        setIsLoading(false)
        setUser(null)
        return
      }

      try {
        const session = await fetchCurrentUser(token)
        if (isMounted) {
          setUser(session.user)
          setAuthError('')
        }
      } catch (error) {
        if (isMounted) {
          localStorage.removeItem(TOKEN_STORAGE_KEY)
          setToken(null)
          setUser(null)
          setAuthError(error.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [token])

  async function signIn(credentials) {
    setAuthError('')
    const data = await loginUser(credentials)
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function signOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
    setAuthError('')
  }

  function updateUser(nextUser) {
    setUser(nextUser)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      authError,
      isAuthenticated: Boolean(token && user),
      signIn,
      signOut,
      updateUser,
    }),
    [authError, isLoading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
