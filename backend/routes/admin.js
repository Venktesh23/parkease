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

router.use(requireAuth, requireAdmin);

router.get('/reservations', async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM ReservationSummaryView';
  const params = [];
  if (status) {
    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }
    query += ' WHERE reservation_status = ?';
    params.push(status);
  }
  query += ' ORDER BY start_time DESC';
  try {
    await issueNoCheckoutFines();
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/reservations failed:', err);
    res.status(500).json({ error: 'Failed to load reservations' });
  }
});

// Query type 10 - Multiple subquery aggregates in one SELECT (dashboard statistics)
router.get('/stats', async (req, res) => {
  try {
    await issueNoCheckoutFines();
    const [rows] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM User WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM Reservation) AS total_reservations,
        (SELECT COUNT(*) FROM Reservation WHERE reservation_status = 'active') AS active_reservations,
        (SELECT COUNT(*) FROM ParkingSlot WHERE availability_status = 'available') AS available_slots,
        (SELECT COUNT(*) FROM ParkingSlot) AS total_slots,
        (SELECT COALESCE(SUM(amount), 0) FROM Fine WHERE status = 'pending') AS outstanding_fines,
        (SELECT COALESCE(SUM(amount), 0) FROM Fine WHERE status = 'paid') AS paid_fines_total,
        (SELECT COUNT(*) FROM Fine WHERE status = 'pending') AS pending_fine_count
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /admin/stats failed:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT user_id, first_name, last_name, email, phone, role, created_at FROM User ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/users failed:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.put('/slots/:id', async (req, res) => {
  const { id } = req.params;
  if (!isPositiveIntString(id)) {
    return res.status(400).json({ error: 'Invalid slot id' });
  }
  const { availability_status } = req.body;
  if (!['available', 'unavailable'].includes(availability_status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  try {
    // Don't allow toggling a slot that has an active reservation right now
    if (availability_status === 'available') {
      const [active] = await pool.execute(
        `SELECT COUNT(*) AS active_count FROM Reservation
         WHERE slot_id = ? AND reservation_status = 'active'`,
        [id]
      );
      if (active[0].active_count > 0) {
        return res.status(400).json({
          error: 'Cannot mark available; this slot still has an active reservation (including overdue until checkout)'
        });
      }
    }

    const [result] = await pool.execute(
      'UPDATE ParkingSlot SET availability_status = ? WHERE slot_id = ?',
      [availability_status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    res.json({ message: 'Slot status updated' });
  } catch (err) {
    console.error('PUT /admin/slots/:id failed:', err);
    res.status(500).json({ error: 'Failed to update slot' });
  }
});

module.exports = router;
