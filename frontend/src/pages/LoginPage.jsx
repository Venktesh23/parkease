import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPasswordStrength(pw) {
  if (!pw) return 0
  if (pw.length < 8) return 1
  const hasUpper = /[A-Z]/.test(pw)
  const hasLower = /[a-z]/.test(pw)
  const hasNumber = /[0-9]/.test(pw)
  if (hasUpper && hasLower && hasNumber) return 4
  if (hasUpper && hasLower) return 3
  return 2
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#dc2626', '#d97706', '#ca8a04', '#006747']

function PasswordStrengthBar({ password }) {
  const strength = getPasswordStrength(password)
  if (!password) return null
  return (
    <div className="pw-strength">
      <div className="pw-strength-bars">
        {[1, 2, 3, 4].map(level => (
          <div
            key={level}
            className="pw-strength-bar"
            style={{ background: level <= strength ? STRENGTH_COLORS[strength] : 'var(--color-border-strong)' }}
          />
        ))}
      </div>
      <span className="pw-strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
        {STRENGTH_LABELS[strength]}
      </span>
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-with-toggle">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={id === 'confirm-password' ? 'new-password' : id === 'signup-password' ? 'new-password' : 'current-password'}
      />
      <button type="button" className="input-toggle-btn" onClick={() => setShow(s => !s)}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export default function LoginPage() {
  const { user, loading, login, signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [tab, setTab] = useState('signin')

  // Sign-in state
  const [siEmail, setSiEmail] = useState(location.state?.defaultEmail || '')
  const [siPassword, setSiPassword] = useState('')
  const [siErrors, setSiErrors] = useState({})
  const [siServerError, setSiServerError] = useState('')
  const [siLoading, setSiLoading] = useState(false)

  // Sign-up state
  const [su, setSu] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirmPassword: ''
  })
  const [suErrors, setSuErrors] = useState({})
  const [suServerError, setSuServerError] = useState('')
  const [suLoading, setSuLoading] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'admin' ? '/admin/overview' : '/customer/reservations', { replace: true })
    }
  }, [user, loading, navigate])

  const switchTab = (t) => {
    setTab(t)
    setSiErrors({})
    setSiServerError('')
    setSuErrors({})
    setSuServerError('')
  }

  // ---- Sign In ----
  const validateSignIn = () => {
    const e = {}
    if (!siEmail.trim()) e.email = 'Email is required'
    if (!siPassword) e.password = 'Password is required'
    return e
  }

  const handleSignIn = async (evt) => {
    evt.preventDefault()
    const e = validateSignIn()
    if (Object.keys(e).length) { setSiErrors(e); return }
    setSiErrors({})
    setSiServerError('')
    setSiLoading(true)
    const result = await login(siEmail.trim(), siPassword)
    setSiLoading(false)
    if (result.success) {
      navigate(result.user.role === 'admin' ? '/admin/overview' : '/customer/reservations', { replace: true })
    } else {
      setSiServerError(result.error)
    }
  }

  // ---- Sign Up ----
  const handleSuChange = (field) => (e) => {
    setSu(prev => ({ ...prev, [field]: e.target.value }))
    setSuErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validateSignUp = () => {
    const e = {}
    if (!su.first_name.trim() || su.first_name.trim().length < 2) {
      e.first_name = 'First name must be at least 2 characters'
    }
    if (!su.last_name.trim() || su.last_name.trim().length < 2) {
      e.last_name = 'Last name must be at least 2 characters'
    }
    if (!su.email.trim() || !EMAIL_REGEX.test(su.email.trim())) {
      e.email = 'Please enter a valid email address'
    }
    if (su.phone.trim()) {
      const digits = su.phone.replace(/\D/g, '')
      if (digits.length !== 10) e.phone = 'Phone must be 10 digits'
    }
    if (!su.password) {
      e.password = 'Password is required'
    } else if (su.password.length < 8) {
      e.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(su.password)) {
      e.password = 'Must contain uppercase, lowercase, and a number'
    }
    if (!su.confirmPassword) {
      e.confirmPassword = 'Please confirm your password'
    } else if (su.password !== su.confirmPassword) {
      e.confirmPassword = 'Passwords do not match'
    }
    return e
  }

  const handleSignUp = async (evt) => {
    evt.preventDefault()
    const e = validateSignUp()
    if (Object.keys(e).length) { setSuErrors(e); return }
    setSuErrors({})
    setSuServerError('')
    setSuLoading(true)
    const result = await signup(
      su.first_name.trim(),
      su.last_name.trim(),
      su.email.trim(),
      su.phone.trim() || null,
      su.password,
      su.confirmPassword
    )
    setSuLoading(false)
    if (result.success) {
      navigate('/customer/reservations', { replace: true })
    } else {
      setSuServerError(result.error)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">ParkEase</div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${tab === 'signin' ? ' active' : ''}`}
            onClick={() => switchTab('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
            onClick={() => switchTab('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Sign In Form */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} noValidate>
            {siServerError && (
              <div className="auth-error-box">{siServerError}</div>
            )}
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={siEmail}
                onChange={e => setSiEmail(e.target.value)}
                autoComplete="email"
              />
              {siErrors.email && <p className="form-error">{siErrors.email}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <PasswordInput
                id="signin-password"
                value={siPassword}
                onChange={e => setSiPassword(e.target.value)}
                placeholder="Enter your password"
              />
              {siErrors.password && <p className="form-error">{siErrors.password}</p>}
            </div>
            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={siLoading}
            >
              {siLoading
                ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Signing in...</>
                : 'Sign In'}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} noValidate>
            {suServerError && (
              <div className="auth-error-box">{suServerError}</div>
            )}
            <div className="name-fields-grid">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Jane"
                  value={su.first_name}
                  onChange={handleSuChange('first_name')}
                  autoComplete="given-name"
                />
                {suErrors.first_name && <p className="form-error">{suErrors.first_name}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Doe"
                  value={su.last_name}
                  onChange={handleSuChange('last_name')}
                  autoComplete="family-name"
                />
                {suErrors.last_name && <p className="form-error">{suErrors.last_name}</p>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={su.email}
                onChange={handleSuChange('email')}
                autoComplete="email"
              />
              {suErrors.email && <p className="form-error">{suErrors.email}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">
                Phone <span className="field-optional">(optional)</span>
              </label>
              <input
                type="tel"
                className="form-control"
                placeholder="5055551234"
                value={su.phone}
                onChange={handleSuChange('phone')}
                autoComplete="tel"
              />
              {suErrors.phone && <p className="form-error">{suErrors.phone}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <PasswordInput
                id="signup-password"
                value={su.password}
                onChange={handleSuChange('password')}
                placeholder="Min. 8 characters"
              />
              <PasswordStrengthBar password={su.password} />
              {suErrors.password && <p className="form-error">{suErrors.password}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <PasswordInput
                id="confirm-password"
                value={su.confirmPassword}
                onChange={handleSuChange('confirmPassword')}
                placeholder="Repeat your password"
              />
              {suErrors.confirmPassword && <p className="form-error">{suErrors.confirmPassword}</p>}
            </div>
            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={suLoading}
            >
              {suLoading
                ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Creating account...</>
                : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
