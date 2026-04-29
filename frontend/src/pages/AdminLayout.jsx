import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const navLinks = [
  {
    to: '/admin/overview',
    label: 'Overview',
    icon: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>
  },
  {
    to: '/admin/reservations',
    label: 'Reservations',
    icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>
  },
  {
    to: '/admin/users',
    label: 'Users',
    icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>
  },
  {
    to: '/admin/slots',
    label: 'Manage Slots',
    icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>
  },
  {
    to: '/admin/fines',
    label: 'Fines',
    icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
  }
]

export default function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar
        links={navLinks}
        subtitle="Admin Dashboard"
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
