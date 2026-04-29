import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const navLinks = [
  {
    to: '/customer/reservations',
    label: 'My Reservations',
    icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>
  },
  {
    to: '/customer/make-reservation',
    label: 'Make Reservation',
    icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></>
  },
  {
    to: '/customer/vehicles',
    label: 'My Vehicles',
    icon: <><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>
  },
  {
    to: '/customer/fines',
    label: 'My Fines',
    icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
  }
]

export default function CustomerLayout() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar
        links={navLinks}
        subtitle="Customer Portal"
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <div className="main-area">
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
