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

// Customer: list my fines (joined with reservation/lot/slot for context)
router.get('/my', requireAuth, async (req, res) => {
  try {
    await issueNoCheckoutFines();
    const [rows] = await pool.execute(`
      SELECT
        f.fine_id, f.reservation_id, f.amount, f.reason, f.status,
        f.issued_at, f.paid_at,
        r.start_time, r.end_time,
        ps.slot_number, pl.lot_name
      FROM Fine f
      JOIN Reservation r  ON f.reservation_id = r.reservation_id
      JOIN ParkingSlot ps ON r.slot_id = ps.slot_id
      JOIN ParkingLot pl  ON ps.lot_id = pl.lot_id
      WHERE f.user_id = ?
      ORDER BY f.issued_at DESC
    `, [req.session.user.user_id]);
    res.json(rows);
  } catch (err) {
    console.error('GET /fines/my failed:', err);
    res.status(500).json({ error: 'Failed to load fines' });
  }
});

// Customer: pay one of my fines
router.put('/:id/pay', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user_id = req.session.user.user_id;
  if (!isPositiveIntString(id)) {
    return res.status(400).json({ error: 'Invalid fine id' });
  }
  try {
    const [rows] = await pool.execute(
      'SELECT fine_id, status FROM Fine WHERE fine_id = ? AND user_id = ?',
      [id, user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ error: `Fine is already ${rows[0].status}` });
    }
    await pool.execute(
      "UPDATE Fine SET status = 'paid', paid_at = NOW() WHERE fine_id = ?",
      [id]
    );
    res.json({ message: 'Fine paid successfully' });
  } catch (err) {
    console.error('PUT /fines/:id/pay failed:', err);
    res.status(500).json({ error: 'Failed to pay fine' });
  }
});

// Admin: list all fines (with customer context, optional status filter)
router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT
      f.fine_id, f.reservation_id, f.amount, f.reason, f.status,
      f.issued_at, f.paid_at,
      u.user_id, u.first_name, u.last_name, u.email,
      ps.slot_number, pl.lot_name
    FROM Fine f
    JOIN User u         ON f.user_id = u.user_id
    JOIN Reservation r  ON f.reservation_id = r.reservation_id
    JOIN ParkingSlot ps ON r.slot_id = ps.slot_id
    JOIN ParkingLot pl  ON ps.lot_id = pl.lot_id
  `;
  const params = [];
  if (status) {
    if (!['pending', 'paid', 'waived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }
    query += ' WHERE f.status = ?';
    params.push(status);
  }
  query += ' ORDER BY f.issued_at DESC';
  try {
    await issueNoCheckoutFines();
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /fines/admin/all failed:', err);
    res.status(500).json({ error: 'Failed to load fines' });
  }
});

// Admin: update a fine's status (paid or waived)
router.put('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isPositiveIntString(id)) {
    return res.status(400).json({ error: 'Invalid fine id' });
  }
  const { status } = req.body;
  if (!['paid', 'waived'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "paid" or "waived"' });
  }
  try {
    const [rows] = await pool.execute('SELECT fine_id FROM Fine WHERE fine_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Fine not found' });

    if (status === 'paid') {
      await pool.execute(
        "UPDATE Fine SET status = 'paid', paid_at = NOW() WHERE fine_id = ?",
        [id]
      );
    } else {
      await pool.execute(
        "UPDATE Fine SET status = 'waived', paid_at = NULL WHERE fine_id = ?",
        [id]
      );
    }
    res.json({ message: `Fine marked as ${status}` });
  } catch (err) {
    console.error('PUT /fines/admin/:id failed:', err);
    res.status(500).json({ error: 'Failed to update fine' });
  }
});

module.exports = router;
