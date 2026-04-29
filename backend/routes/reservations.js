const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { issueNoCheckoutFines } = require('../services/finesService');

const router = express.Router();

function isPositiveIntString(value) {
  return typeof value === 'string' || typeof value === 'number'
    ? /^\d+$/.test(String(value))
    : false;
}

function isValidDateTime(value) {
  if (!value || typeof value !== 'string') return false;
  const ts = Date.parse(value);
  return !Number.isNaN(ts);
}

// Query type 4 - SELECT from VIEW (customer's own reservations)
router.get('/my', requireAuth, async (req, res) => {
  try {
    await issueNoCheckoutFines();
    const [rows] = await pool.execute(
      'SELECT * FROM ReservationSummaryView WHERE user_id = ? ORDER BY start_time DESC',
      [req.session.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /reservations/my failed:', err);
    res.status(500).json({ error: 'Failed to load reservations' });
  }
});

// Query type 5 - CALL stored procedure CreateReservation
router.post('/', requireAuth, async (req, res) => {
  const { vehicle_id, slot_id, start_time, end_time } = req.body;
  const user_id = req.session.user.user_id;

  if (!vehicle_id || !slot_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'All reservation fields are required' });
  }
  if (!Number.isInteger(Number(vehicle_id)) || !Number.isInteger(Number(slot_id))) {
    return res.status(400).json({ error: 'Invalid vehicle or slot identifier' });
  }
  if (!isValidDateTime(start_time) || !isValidDateTime(end_time)) {
    return res.status(400).json({ error: 'Invalid start_time or end_time' });
  }
  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }
  const startDiffMs = new Date(start_time).getTime() - Date.now();
  const durationMs = new Date(end_time).getTime() - new Date(start_time).getTime();
  if (startDiffMs < 0 || startDiffMs > 12 * 60 * 60 * 1000) {
    return res.status(400).json({ error: 'Start time must be within the next 12 hours' });
  }
  if (durationMs <= 0) {
    return res.status(400).json({ error: 'Reservation must have a positive duration' });
  }
  if (durationMs > 24 * 60 * 60 * 1000) {
    return res.status(400).json({ error: 'Reservation duration cannot exceed 24 hours' });
  }
  try {
    // Confirm the chosen vehicle belongs to the calling user before booking
    const [veh] = await pool.execute(
      'SELECT vehicle_id FROM Vehicle WHERE vehicle_id = ? AND user_id = ?',
      [vehicle_id, user_id]
    );
    if (veh.length === 0) {
      return res.status(400).json({ error: 'Selected vehicle does not belong to you' });
    }

    const [rows] = await pool.execute(
      'CALL CreateReservation(?, ?, ?, ?, ?)',
      [user_id, vehicle_id, slot_id, start_time, end_time]
    );
    const result = rows[0][0];
    res.json({
      reservation_id: result.reservation_id,
      message: 'Reservation created successfully'
    });
  } catch (err) {
    if (err.sqlState === '45000') {
      return res.status(400).json({ error: err.sqlMessage || err.message });
    }
    console.error('POST /reservations failed:', err);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// Query type 6 - UPDATE two tables (cancel reservation + free the slot) — transactional
router.put('/:id/cancel', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user_id = req.session.user.user_id;
  if (!isPositiveIntString(id)) {
    return res.status(400).json({ error: 'Invalid reservation id' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT * FROM Reservation WHERE reservation_id = ? AND user_id = ? FOR UPDATE',
      [id, user_id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }
    const reservation = rows[0];
    if (reservation.reservation_status !== 'active') {
      await conn.rollback();
      return res.status(400).json({ error: 'Only active reservations can be cancelled' });
    }
    if (new Date(reservation.start_time) <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ error: 'Cannot cancel a reservation that has already started' });
    }
    await conn.execute(
      'UPDATE Reservation SET reservation_status = ? WHERE reservation_id = ?',
      ['cancelled', id]
    );
    await conn.execute(
      'UPDATE ParkingSlot SET availability_status = ? WHERE slot_id = ?',
      ['available', reservation.slot_id]
    );
    await conn.commit();
    res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('PUT /reservations/:id/cancel failed:', err);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  } finally {
    if (conn) conn.release();
  }
});

// CALL stored procedure CompleteReservation - check out, free slot, auto-fine on overstay
router.put('/:id/checkout', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user_id = req.session.user.user_id;
  if (!isPositiveIntString(id)) {
    return res.status(400).json({ error: 'Invalid reservation id' });
  }
  try {
    const [rows] = await pool.execute(
      'CALL CompleteReservation(?, ?)',
      [id, user_id]
    );
    const result = rows[0][0];
    res.json({
      reservation_id: result.reservation_id,
      overstay_minutes: Number(result.overstay_minutes),
      fine_amount: Number(result.fine_amount),
      message: Number(result.fine_amount) > 0
        ? `Checked out with overstay fine of $${Number(result.fine_amount).toFixed(2)}`
        : 'Checked out successfully'
    });
  } catch (err) {
    if (err.sqlState === '45000') {
      return res.status(400).json({ error: err.sqlMessage || err.message });
    }
    console.error('PUT /reservations/:id/checkout failed:', err);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// Query type 7 - DELETE (admin only) via stored procedure (transactional)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isPositiveIntString(id)) {
    return res.status(400).json({ error: 'Invalid reservation id' });
  }
  try {
    const [rows] = await pool.execute('CALL AdminDeleteReservation(?)', [id]);
    const result = rows[0][0];
    res.json({
      message: 'Reservation deleted successfully',
      deleted_reservation_id: result.deleted_reservation_id
    });
  } catch (err) {
    if (err.sqlState === '45000') {
      const msg = err.sqlMessage || err.message || '';
      if (/not found/i.test(msg)) {
        return res.status(404).json({ error: msg });
      }
      return res.status(400).json({ error: msg });
    }
    console.error('DELETE /reservations/:id failed:', err);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

module.exports = router;
