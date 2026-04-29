import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus'
import { useToast } from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminFines() {
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const fetchFines = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/api/fines/admin/all')
      setFines(res.data)
    } catch {
      showToast('Failed to load fines', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchFines(false) }, [fetchFines])
  useRefetchOnFocus(() => fetchFines(true))

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Fines</h2>
        <p className="page-subtitle">
          No-checkout overstay fines recorded across customers (informational)
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : fines.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <p className="empty-state-title">No fines on record</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fine ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Lot / Slot</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {fines.map(f => (
                <tr key={f.fine_id}>
                  <td className="td-muted-id">#{f.fine_id}</td>
                  <td className="td-strong">{f.first_name} {f.last_name}</td>
                  <td className="td-secondary">{f.email}</td>
                  <td className="td-secondary">{f.lot_name} · {f.slot_number}</td>
                  <td>{f.reason}</td>
                  <td className="td-strong">${Number(f.amount).toFixed(2)}</td>
                  <td className="td-secondary">{formatDate(f.issued_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
