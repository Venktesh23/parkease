import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import api from '../api/axios'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus'

const STEPS = ['Select Lot', 'Select Slot', 'Vehicle & Time', 'Review']

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTES_OPTS = Array.from({ length: 60 }, (_, i) => i)

function twelveHourPartsTo24(h12, minuteStr, period) {
  const h = parseInt(String(h12), 10)
  const m = parseInt(String(minuteStr), 10)
  if (Number.isNaN(h) || Number.isNaN(m) || h < 1 || h > 12) return null
  let h24
  if (period === 'AM') {
    h24 = h === 12 ? 0 : h
  } else {
    h24 = h === 12 ? 12 : h + 12
  }
  return { h24, m }
}

function buildDateTimeFrom12hParts(h12, minuteStr, period, reference = new Date()) {
  const parts = twelveHourPartsTo24(h12, minuteStr, period)
  if (!parts) return null
  const candidate = new Date(reference)
  candidate.setSeconds(0, 0)
  candidate.setHours(parts.h24, parts.m, 0, 0)
  if (candidate <= reference) {
    candidate.setDate(candidate.getDate() + 1)
  }
  return candidate
}

function format12hPartsLabel(h12, minuteStr, period) {
  if (h12 === '' || minuteStr === '' || !period) return '-'
  const mm = String(minuteStr).padStart(2, '0')
  return `${h12}:${mm} ${period}`
}

function TimePicker12h({
  idPrefix,
  hour,
  minute,
  period,
  onHour,
  onMinute,
  onPeriod,
}) {
  return (
    <div className="time-picker-12h" role="group" aria-labelledby={`${idPrefix}-label`}>
      <select
        id={`${idPrefix}-hour`}
        className="form-control time-picker-select"
        value={hour}
        onChange={e => onHour(e.target.value)}
        aria-label="Hour"
      >
        <option value="">Hour</option>
        {HOURS_12.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="time-picker-sep" aria-hidden>:</span>
      <select
        id={`${idPrefix}-minute`}
        className="form-control time-picker-select"
        value={minute}
        onChange={e => onMinute(e.target.value)}
        aria-label="Minute"
      >
        <option value="">Min</option>
        {MINUTES_OPTS.map(m => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
      <select
        id={`${idPrefix}-ampm`}
        className="form-control time-picker-select time-picker-ampm"
        value={period}
        onChange={e => onPeriod(e.target.value)}
        aria-label="AM or PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}

function toSqlDateTime(dateObj) {
  const yyyy = dateObj.getFullYear()
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
  const dd = String(dateObj.getDate()).padStart(2, '0')
  const hh = String(dateObj.getHours()).padStart(2, '0')
  const mi = String(dateObj.getMinutes()).padStart(2, '0')
  const ss = String(dateObj.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {STEPS.map((label, i) => {
        const num = i + 1
        const isActive = num === current
        const isDone = num < current
        return (
          <div key={i} className="step-indicator-cell" style={{ flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div className={`step-item${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
              <div className="step-number">{isDone ? '✓' : num}</div>
              <span className="step-label">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-connector${isDone ? ' done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ClickableCard({ selected, onSelect, className, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={className}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {children}
    </div>
  )
}

export default function MakeReservation() {
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [lots, setLots] = useState([])
  const [slots, setSlots] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [lotsLoading, setLotsLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedLot, setSelectedLot] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [startHour, setStartHour] = useState('')
  const [startMinute, setStartMinute] = useState('')
  const [startPeriod, setStartPeriod] = useState('AM')
  const [endHour, setEndHour] = useState('')
  const [endMinute, setEndMinute] = useState('')
  const [endPeriod, setEndPeriod] = useState('AM')

  const loadLotsAndVehicles = useCallback(async () => {
    try {
      const [lotsRes, vehRes] = await Promise.all([
        api.get('/api/lots'),
        api.get('/api/vehicles/my')
      ])
      setLots(lotsRes.data)
      setVehicles(vehRes.data)
    } catch {
      showToast('Failed to load reservation options', 'error')
    } finally {
      setLotsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    setLotsLoading(true)
    loadLotsAndVehicles()
  }, [loadLotsAndVehicles])

  useRefetchOnFocus(() => {
    loadLotsAndVehicles()
  })

  useEffect(() => {
    if (!selectedLot) return
    setSlotsLoading(true)
    api.get('/api/slots', { params: { status: 'available', lot_id: selectedLot.lot_id } })
      .then(res => setSlots(res.data))
      .catch(() => showToast('Failed to load slots', 'error'))
      .finally(() => setSlotsLoading(false))
  }, [selectedLot, showToast])

  const handleSelectLot = (lot) => {
    setSelectedLot(lot)
    setSelectedSlot(null)
    setSlots([])
  }

  const goNext = () => setStep(s => s + 1)
  const goBack = () => setStep(s => s - 1)

  const validateStep = () => {
    if (step === 1) {
      if (!selectedLot) { showToast('Please select a parking lot', 'error'); return false }
      if (Number(selectedLot.available_slots) <= 0) {
        showToast('This lot has no available slots', 'error'); return false
      }
    }
    if (step === 2) {
      if (!selectedSlot) { showToast('Please select a slot', 'error'); return false }
    }
    if (step === 3) {
      if (!selectedVehicle) { showToast('Please select a vehicle', 'error'); return false }
      if (startHour === '' || startMinute === '' || endHour === '' || endMinute === '') {
        showToast('Please select start and end time (hour, minute, AM/PM)', 'error'); return false
      }
      const now = new Date()
      const startAt = buildDateTimeFrom12hParts(startHour, startMinute, startPeriod, now)
      if (!startAt) { showToast('Invalid start time', 'error'); return false }
      let endAt = buildDateTimeFrom12hParts(endHour, endMinute, endPeriod, startAt)
      if (!endAt) { showToast('Invalid end time', 'error'); return false }
      if (endAt <= startAt) {
        endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000)
      }
      const startDiffHours = (startAt - now) / (60 * 60 * 1000)
      const durationHours = (endAt - startAt) / (60 * 60 * 1000)
      if (startDiffHours <= 0 || startDiffHours > 12) {
        showToast('Start time must be within the next 12 hours', 'error'); return false
      }
      if (durationHours <= 0) {
        showToast('End time must be after start time', 'error'); return false
      }
      if (durationHours > 24) {
        showToast('Reservation duration cannot exceed 24 hours', 'error'); return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) goNext()
  }

  const handleSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    try {
      const now = new Date()
      const startAt = buildDateTimeFrom12hParts(startHour, startMinute, startPeriod, now)
      let endAt = buildDateTimeFrom12hParts(endHour, endMinute, endPeriod, startAt)
      if (!startAt || !endAt) {
        showToast('Invalid time selection', 'error')
        setSubmitting(false)
        return
      }
      if (endAt <= startAt) {
        endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000)
      }
      const res = await api.post('/api/reservations', {
        vehicle_id: parseInt(selectedVehicle, 10),
        slot_id: selectedSlot.slot_id,
        start_time: toSqlDateTime(startAt),
        end_time: toSqlDateTime(endAt)
      })
      showToast('Reservation created successfully', 'success')
      navigate('/customer/reservations')
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create reservation', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedVehicleObj = vehicles.find(v => v.vehicle_id === parseInt(selectedVehicle, 10))

  if (lotsLoading) return <LoadingSpinner />

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Make a Reservation</h2>
        <p className="page-subtitle">Book your parking spot in a few easy steps</p>
      </div>

      {vehicles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">No vehicles on file</p>
            <p className="empty-state-desc">
              Add a vehicle before making a reservation.
            </p>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => navigate('/customer/vehicles')}>
                Go to My Vehicles
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <StepIndicator current={step} />

            {/* Step 1: Select Lot */}
            {step === 1 && (
              <div>
                <h3 className="section-title">Choose a Parking Lot</h3>
                {lots.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state-title">No parking lots available</p>
                    <p className="empty-state-desc">Please check back later</p>
                  </div>
                ) : (
                  <div className="lot-cards-grid">
                    {lots.map(lot => {
                      const available = Number(lot.available_slots)
                      const disabled = available <= 0
                      return (
                        <ClickableCard
                          key={lot.lot_id}
                          selected={selectedLot?.lot_id === lot.lot_id}
                          onSelect={() => !disabled && handleSelectLot(lot)}
                          className={
                            'lot-card' +
                            (selectedLot?.lot_id === lot.lot_id ? ' selected' : '') +
                            (disabled ? ' disabled' : '')
                          }
                        >
                          <div className="lot-card-name">{lot.lot_name}</div>
                          <div className="lot-card-location">{lot.location}</div>
                          <div className="lot-card-slots">
                            <div className="lot-card-slots-dot" />
                            {available} slots available
                          </div>
                          {lot.opening_time && (
                            <div className="lot-card-hours">
                              Open {lot.opening_time.slice(0, 5)} - {lot.closing_time?.slice(0, 5)}
                            </div>
                          )}
                        </ClickableCard>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Select Slot */}
            {step === 2 && (
              <div>
                <h3 className="section-title">
                  Available Slots in {selectedLot?.lot_name}
                </h3>
                {slotsLoading ? (
                  <LoadingSpinner />
                ) : slots.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state-title">No available slots</p>
                    <p className="empty-state-desc">All slots in this lot are currently occupied</p>
                  </div>
                ) : (
                  <div className="slot-grid">
                    {slots.map(slot => (
                      <ClickableCard
                        key={slot.slot_id}
                        selected={selectedSlot?.slot_id === slot.slot_id}
                        onSelect={() => setSelectedSlot(slot)}
                        className={`slot-card${selectedSlot?.slot_id === slot.slot_id ? ' selected' : ''}`}
                      >
                        <div className="slot-card-number">{slot.slot_number}</div>
                        <StatusBadge status={slot.slot_type} />
                      </ClickableCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Vehicle & Time */}
            {step === 3 && (
              <div>
                <h3 className="section-title">Vehicle &amp; Booking Time</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="mr-vehicle">Select Vehicle</label>
                    <select
                      id="mr-vehicle"
                      className="form-control"
                      value={selectedVehicle}
                      onChange={e => setSelectedVehicle(e.target.value)}
                    >
                      <option value="">-- Choose a vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.brand} {v.model} ({v.license_plate})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div />
                  <div className="form-group form-group-span-2">
                    <span className="form-label" id="mr-start-label">Start Time</span>
                    <TimePicker12h
                      idPrefix="mr-start"
                      hour={startHour}
                      minute={startMinute}
                      period={startPeriod}
                      onHour={setStartHour}
                      onMinute={setStartMinute}
                      onPeriod={setStartPeriod}
                    />
                  </div>
                  <div className="form-group form-group-span-2">
                    <span className="form-label" id="mr-end-label">End Time</span>
                    <TimePicker12h
                      idPrefix="mr-end"
                      hour={endHour}
                      minute={endMinute}
                      period={endPeriod}
                      onHour={setEndHour}
                      onMinute={setEndMinute}
                      onPeriod={setEndPeriod}
                    />
                  </div>
                </div>
                <p className="form-note">
                  Reservations must start within the next 12 hours and cannot exceed 24 hours in duration.
                </p>
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {step === 4 && (
              <div>
                <h3 className="section-title">Review</h3>
                <div className="review-card">
                  <div className="review-row">
                    <span className="review-row-label">Parking Lot</span>
                    <span className="review-row-value">{selectedLot?.lot_name}</span>
                  </div>
                  <div className="review-row">
                    <span className="review-row-label">Slot</span>
                    <span className="review-row-value">
                      {selectedSlot?.slot_number} ({selectedSlot?.slot_type})
                    </span>
                  </div>
                  <div className="review-row">
                    <span className="review-row-label">Vehicle</span>
                    <span className="review-row-value">
                      {selectedVehicleObj
                        ? `${selectedVehicleObj.brand} ${selectedVehicleObj.model} (${selectedVehicleObj.license_plate})`
                        : '-'}
                    </span>
                  </div>
                  <div className="review-row">
                    <span className="review-row-label">Start Time</span>
                    <span className="review-row-value">
                      {format12hPartsLabel(startHour, startMinute, startPeriod)}
                    </span>
                  </div>
                  <div className="review-row">
                    <span className="review-row-label">End Time</span>
                    <span className="review-row-value">
                      {format12hPartsLabel(endHour, endMinute, endPeriod)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="step-nav">
              <div>
                {step > 1 && (
                  <button className="btn btn-ghost" onClick={goBack}>
                    Back
                  </button>
                )}
              </div>
              <div>
                {step < 4 ? (
                  <button className="btn btn-primary" onClick={handleNext}>
                    Continue
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting
                      ? <><div className="spinner spinner-sm spinner-on-primary" /> Processing...</>
                      : 'Confirm Reservation'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
