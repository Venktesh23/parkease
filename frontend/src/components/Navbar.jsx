import { useAuth } from '../context/AuthContext'
import StatusBadge from './StatusBadge'

export default function Navbar({ onToggleSidebar }) {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="topbar-right">
        {user && (
          <>
            <span className="topbar-username">
              {user.first_name} {user.last_name}
            </span>
            <StatusBadge status={user.role} />
          </>
        )}
      </div>
    </header>
  )
}
