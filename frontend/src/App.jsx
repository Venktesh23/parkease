import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, ProtectedRoute } from './context/AuthContext'
import { ToastProvider } from './components/Toast'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import CustomerLayout from './pages/CustomerLayout'
import MyReservations from './pages/MyReservations'
import MakeReservation from './pages/MakeReservation'
import MyVehicles from './pages/MyVehicles'
import MyFines from './pages/MyFines'
import AdminLayout from './pages/AdminLayout'
import AdminOverview from './pages/AdminOverview'
import AdminReservations from './pages/AdminReservations'
import AdminUsers from './pages/AdminUsers'
import AdminSlots from './pages/AdminSlots'
import AdminFines from './pages/AdminFines'

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Customer routes */}
      <Route path="/customer" element={<ProtectedRoute role="customer" />}>
        <Route element={<CustomerLayout />}>
          <Route index element={<Navigate to="/customer/reservations" replace />} />
          <Route path="reservations" element={<MyReservations />} />
          <Route path="make-reservation" element={<MakeReservation />} />
          <Route path="vehicles" element={<MyVehicles />} />
          <Route path="fines" element={<MyFines />} />
        </Route>
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin" />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="slots" element={<AdminSlots />} />
          <Route path="fines" element={<AdminFines />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
