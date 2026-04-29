import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus'
import { useToast } from '../components/Toast'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AdminSlots() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const { showToast } = useToast()

  const fetchSlots = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/api/slots')
      setSlots(res.data)
    } catch {
      showToast('Failed to load slots', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchSlots(false) }, [fetchSlots])
  useRefetchOnFocus(() => fetchSlots(true))

  const handleToggle = async (slot) => {
    const newStatus = slot.availability_status === 'available' ? 'unavailable' : 'available'
    setToggling(slot.slot_id)
    try {
      await api.put(`/api/admin/slots/${slot.slot_id}`, { availability_status: newStatus })
      showToast(`Slot ${slot.slot_number} marked as ${newStatus}`, 'success')
      fetchSlots()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update slot', 'error')
    } finally {
      setToggling(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Manage Slots</h2>
        <p className="page-subtitle">Toggle availability of individual parking slots</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Slot ID</th>
                <th>Lot</th>
                <th>Slot Number</th>
                <th>Type</th>
                <th>Status</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <tr key={slot.slot_id}>
                  <td className="td-muted-id">#{slot.slot_id}</td>
                  <td className="td-secondary td-truncate">{slot.lot_name}</td>
                  <td className="td-strong td-large">{slot.slot_number}</td>
                  <td><StatusBadge status={slot.slot_type} /></td>
                  <td><StatusBadge status={slot.availability_status} /></td>
                  <td className="col-action">
                    <button
                      className={`btn btn-sm ${slot.availability_status === 'available' ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => handleToggle(slot)}
                      disabled={toggling === slot.slot_id}
                    >
                      {toggling === slot.slot_id
                        ? 'Updating...'
                        : slot.availability_status === 'available'
                          ? 'Mark Unavailable'
                          : 'Mark Available'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
