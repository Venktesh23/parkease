import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmModal from '../components/ConfirmModal'
import StatusBadge from '../components/StatusBadge'

const emptyForm = { license_plate: '', vehicle_type: 'sedan', brand: '', model: '', color: '' }

export default function MyVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { showToast } = useToast()
  const firstFieldRef = useRef(null)

  const closeAddModal = useCallback(() => {
    if (submitting) return
    setShowForm(false)
    setForm(emptyForm)
    setErrors({})
  }, [submitting])

  useEffect(() => {
    if (!showForm) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeAddModal()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    queueMicrotask(() => firstFieldRef.current?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [showForm, closeAddModal])

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/api/vehicles/my')
      setVehicles(res.data)
    } catch {
      showToast('Failed to load vehicles', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVehicles() }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.license_plate.trim()) errs.license_plate = 'License plate is required'
    if (!form.brand.trim()) errs.brand = 'Brand is required'
    if (!form.model.trim()) errs.model = 'Model is required'
    return errs
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    try {
      await api.post('/api/vehicles', form)
      showToast('Vehicle added successfully', 'success')
      setForm(emptyForm)
      setShowForm(false)
      fetchVehicles()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add vehicle', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/api/vehicles/${deleteTarget}`)
      showToast('Vehicle removed', 'success')
      fetchVehicles()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to remove vehicle', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 className="page-title">My Vehicles</h2>
          <p className="page-subtitle">Manage vehicles linked to your account</p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add Vehicle
          </button>
        )}
      </div>

      {showForm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-modal-title"
          onClick={() => closeAddModal()}
        >
          <div
            className="auth-card auth-card--modal"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="modal-title" id="vehicle-modal-title">Add New Vehicle</h2>
            <form onSubmit={handleAdd} noValidate>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="veh-license">License Plate</label>
                  <input
                    ref={firstFieldRef}
                    id="veh-license"
                    name="license_plate"
                    className="form-control"
                    placeholder="e.g. ABC-123"
                    value={form.license_plate}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  {errors.license_plate && <p className="form-error">{errors.license_plate}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="veh-type">Vehicle Type</label>
                  <select
                    id="veh-type"
                    name="vehicle_type"
                    className="form-control"
                    value={form.vehicle_type}
                    onChange={handleChange}
                  >
                    <option value="sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="truck">Truck</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="veh-brand">Brand</label>
                  <input
                    id="veh-brand"
                    name="brand"
                    className="form-control"
                    placeholder="e.g. Toyota"
                    value={form.brand}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  {errors.brand && <p className="form-error">{errors.brand}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="veh-model">Model</label>
                  <input
                    id="veh-model"
                    name="model"
                    className="form-control"
                    placeholder="e.g. Camry"
                    value={form.model}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  {errors.model && <p className="form-error">{errors.model}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="veh-color">Color</label>
                  <input
                    id="veh-color"
                    name="color"
                    className="form-control"
                    placeholder="e.g. Silver"
                    value={form.color}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Vehicle'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeAddModal} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : vehicles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <p className="empty-state-title">No vehicles added</p>
            <p className="empty-state-desc">Add a vehicle to make reservations</p>
          </div>
        </div>
      ) : (
        <div className="vehicle-cards-grid">
          {vehicles.map(v => (
            <div key={v.vehicle_id} className="vehicle-card">
              <div className="vehicle-card-header">
                <div>
                  <div className="vehicle-card-title">{v.brand} {v.model}</div>
                </div>
                <div className="vehicle-card-plate">{v.license_plate}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {v.vehicle_type && <StatusBadge status={v.vehicle_type} />}
              </div>
              <div className="vehicle-card-detail">
                Color: <span>{v.color || 'N/A'}</span>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setDeleteTarget(v.vehicle_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Remove Vehicle"
          message="Are you sure you want to remove this vehicle? Any associated reservations may be affected."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
