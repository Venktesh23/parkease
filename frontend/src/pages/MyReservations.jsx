import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../components/Toast'

function formatDateOnly(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimeOnly(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function MyReservations() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [checkoutTarget, setCheckoutTarget] = useState(null)
  const [actionPending, setActionPending] = useState(false)
  const { showToast } = useToast()

  const fetchReservations = async () => {
    try {
      const res = await api.get('/api/reservations/my')
      setReservations(res.data)
    } catch {
      showToast('Failed to load reservations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReservations() }, [])
  useRefetchOnFocus(fetchReservations)

  const handleCancel = async () => {
    if (!cancelTarget || actionPending) return
    setActionPending(true)
    try {
      await api.put(`/api/reservations/${cancelTarget}/cancel`)
      showToast('Reservation cancelled successfully', 'success')
      fetchReservations()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel reservation', 'error')
    } finally {
      setCancelTarget(null)
      setActionPending(false)
    }
  }

  const handleCheckout = async () => {
    if (!checkoutTarget || actionPending) return
    setActionPending(true)
    try {
      const res = await api.put(`/api/reservations/${checkoutTarget}/checkout`)
      showToast(res.data.message || 'Checked out successfully', 'success')
      fetchReservations()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to check out', 'error')
    } finally {
      setCheckoutTarget(null)
      setActionPending(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">My Reservations</h2>
        <p className="page-subtitle">View and manage all your parking reservations</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : reservations.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="empty-state-title">No reservations yet</p>
            <p className="empty-state-desc">Go to Make Reservation to book your first spot</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Slot</th>
                <th>Lot</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => {
                const now = new Date()
                const start = new Date(r.start_time)
                const isActive = r.reservation_status === 'active'
                const canCancel = isActive && start > now
                const canCheckout = isActive && start <= now
                const hasStarted = start <= now
                return (
                  <tr key={r.reservation_id}>
                    <td className="td-muted-id">#{r.reservation_id}</td>
                    <td className="td-strong">{r.slot_number}</td>
                    <td className="td-truncate">{r.lot_name}</td>
                    <td>{formatDateOnly(r.reservation_date)}</td>
                    <td className="td-secondary">
                      {formatTimeOnly(r.start_time)} – {formatTimeOnly(r.end_time)}
                    </td>
                    <td>
                      {isActive && hasStarted && (
                        <span className="badge badge-active">Active</span>
                      )}
                      {isActive && !hasStarted && (
                        <span className="badge badge-upcoming">Upcoming</span>
                      )}
                      {!isActive && <StatusBadge status={r.reservation_status} />}
                    </td>
                    <td className="col-action">
                      {canCheckout && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => setCheckoutTarget(r.reservation_id)}
                          disabled={actionPending}
                        >
                          Check Out
                        </button>
                      )}
                      {canCancel && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setCancelTarget(r.reservation_id)}
                          disabled={actionPending}
                        >
                          Cancel
                        </button>
                      )}
                      {!canCancel && !canCheckout && (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {cancelTarget !== null && (
        <ConfirmModal
          title="Cancel Reservation"
          message="Are you sure you want to cancel this reservation? This action cannot be undone."
          confirmLabel="Yes, Cancel"
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
          busy={actionPending}
        />
      )}

      {checkoutTarget !== null && (
        <ConfirmModal
          title="Confirm Checkout"
          message="Are you sure you want to check out? This will mark your reservation as completed. If you are past the end time, an overstay fine will be added automatically."
          confirmLabel="Check Out"
          confirmVariant="primary"
          onConfirm={handleCheckout}
          onCancel={() => setCheckoutTarget(null)}
          busy={actionPending}
        />
      )}
    </>
  )
}
