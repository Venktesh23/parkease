import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus'
import { useToast } from '../components/Toast'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmModal from '../components/ConfirmModal'

function formatDateTime(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function AdminReservations() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()

  const fetchReservations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await api.get(`/api/admin/reservations${params}`)
      setReservations(res.data)
    } catch {
      showToast('Failed to load reservations', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [statusFilter, showToast])

  useEffect(() => { fetchReservations(false) }, [fetchReservations])
  useRefetchOnFocus(() => fetchReservations(true))

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await api.delete(`/api/reservations/${deleteTarget}`)
      showToast('Reservation deleted', 'success')
      fetchReservations()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error')
    } finally {
      setDeleteTarget(null)
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">All Reservations</h2>
        <p className="page-subtitle">View and manage every reservation in the system</p>
      </div>

      <div className="filter-row">
        <label htmlFor="adm-res-filter" className="filter-label">Filter by status:</label>
        <select
          id="adm-res-filter"
          className="form-control filter-control"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : reservations.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <p className="empty-state-title">No reservations found</p>
            <p className="empty-state-desc">Try adjusting your filter</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Vehicle</th>
                <th>Slot</th>
                <th>Lot</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.reservation_id}>
                  <td className="td-muted-id">#{r.reservation_id}</td>
                  <td className="td-strong nowrap">{r.first_name} {r.last_name}</td>
                  <td className="td-secondary">{r.email}</td>
                  <td className="td-secondary">{r.brand} {r.model}</td>
                  <td className="td-strong">{r.slot_number}</td>
                  <td className="td-secondary td-truncate">{r.lot_name}</td>
                  <td className="td-secondary">{formatDateTime(r.start_time)}</td>
                  <td className="td-secondary">{formatDateTime(r.end_time)}</td>
                  <td><StatusBadge status={r.reservation_status} /></td>
                  <td className="col-action">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteTarget(r.reservation_id)}
                      disabled={deleting}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget !== null && (
        <ConfirmModal
          title="Delete Reservation"
          message="Permanently delete this reservation? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </>
  )
}
