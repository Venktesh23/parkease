import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ links, subtitle = '', open = false, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleNavClick = () => {
    if (onClose) onClose()
  }

  return (
    <>
      <div
        className={`sidebar-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Primary navigation">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">ParkEase</span>
          {subtitle && <span className="sidebar-logo-sub">{subtitle}</span>}
        </div>

        <nav className="sidebar-nav">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                'sidebar-nav-link' + (isActive ? ' active' : '')
              }
            >
              <svg
                className="sidebar-nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {link.icon}
              </svg>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user-name">
              {user.first_name} {user.last_name}
            </div>
          )}
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
