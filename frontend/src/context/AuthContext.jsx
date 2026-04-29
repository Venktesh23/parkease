import { createContext, useContext, useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password })
      setUser(res.data.user)
      return { success: true, user: res.data.user }
    } catch (err) {
      const error = err.response?.data?.error || 'Login failed. Please try again.'
      return { success: false, error }
    }
  }

  const signup = async (first_name, last_name, email, phone, password, confirmPassword) => {
    try {
      const res = await api.post('/api/auth/signup', {
        first_name, last_name, email, phone, password, confirmPassword
      })
      setUser(res.data.user)
      return { success: true, user: res.data.user }
    } catch (err) {
      const error = err.response?.data?.error || 'Signup failed. Please try again.'
      return { success: false, error }
    }
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (err) {
      console.warn('Logout request failed; clearing local session anyway.', err)
    }
    setUser(null)
    return { success: true }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function ProtectedRoute({ role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="full-page-spinner">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (role && user.role !== role) {
    return <Navigate
      to={user.role === 'admin' ? '/admin/overview' : '/customer/reservations'}
      replace
    />
  }

  return <Outlet />
}
