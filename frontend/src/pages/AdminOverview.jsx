import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import StatsCard from '../components/StatsCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus'

function formatDateTime(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [statsRes, resRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/reservations')
      ])
      setStats(statsRes.data)
      setRecent(resRes.data.slice(0, 5))
    } catch {
      if (!silent) showToast('Failed to load dashboard', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadDashboard(false) }, [loadDashboard])
  useRefetchOnFocus(() => loadDashboard(true))

  if (loading) return <LoadingSpinner />

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Dashboard Overview</h2>
        <p className="page-subtitle">System-wide metrics and recent activity</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <StatsCard label="Total Customers" value={stats.total_customers} />
          <StatsCard label="Active Reservations" value={stats.active_reservations} />
          <StatsCard
            label="Available Slots"
            value={`${stats.available_slots} / ${stats.total_slots}`}
          />
          <StatsCard label="Total Reservations" value={stats.total_reservations} />
          <StatsCard
            label="Outstanding Fines"
            value={`$${Number(stats.outstanding_fines).toFixed(2)}`}
          />
          <StatsCard label="Pending fines" value={stats.pending_fine_count} />
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Reservations</h3>
          <span className="card-meta">Last 5 bookings</span>
        </div>
        {recent.length === 0 ? (
          <div className="card-empty">No reservations yet</div>
        ) : (
          <div className="table-wrapper-flat">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Slot</th>
                  <th>Lot</th>
                  <th>Start Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.reservation_id}>
                    <td className="td-muted-id">#{r.reservation_id}</td>
                    <td className="td-strong">{r.first_name} {r.last_name}</td>
                    <td className="td-strong">{r.slot_number}</td>
                    <td className="td-secondary">{r.lot_name}</td>
                    <td className="td-secondary">{formatDateTime(r.start_time)}</td>
                    <td><StatusBadge status={r.reservation_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
