import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyFines() {
  const { showToast } = useToast()
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFines = async () => {
    try {
      const res = await api.get('/api/fines/my')
      setFines(res.data)
    } catch {
      showToast('Failed to load fines', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFines() }, [])
  useRefetchOnFocus(fetchFines)

  if (loading) return <LoadingSpinner />

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">My Fines</h2>
        <p className="page-subtitle">
          Fines appear when a reservation ends and you have not checked out on time
        </p>
      </div>

      {fines.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <p className="empty-state-title">No fines on your account</p>
            <p className="empty-state-desc">Check out before your end time to avoid a fine</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fine ID</th>
                <th>Reservation</th>
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
                  <td className="td-muted-id">#{f.reservation_id}</td>
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
