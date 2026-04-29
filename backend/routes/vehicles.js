const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

function isPositiveIntString(value) {
  return typeof value === 'string' || typeof value === 'number'
    ? /^\d+$/.test(String(value))
    : false;
}

const VEHICLE_TYPES = ['sedan', 'SUV', 'motorcycle', 'truck'];
const PLATE_REGEX = /^[A-Z0-9]{1,4}-?[A-Z0-9]{1,5}$/i;

router.get('/my', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM Vehicle WHERE user_id = ? ORDER BY vehicle_id DESC',
      [req.session.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /vehicles/my failed:', err);
    res.status(500).json({ error: 'Failed to load vehicles' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { license_plate, vehicle_type, brand, model, color } = req.body;
  const user_id = req.session.user.user_id;

  if (!license_plate || !license_plate.trim()) {
    return res.status(400).json({ error: 'License plate is required' });
  }
  const plate = license_plate.trim().toUpperCase();
  if (!PLATE_REGEX.test(plate)) {
    return res.status(400).json({ error: 'License plate format looks invalid (e.g. ABC-123)' });
  }
  if (vehicle_type && !VEHICLE_TYPES.includes(vehicle_type)) {
    return res.status(400).json({ error: 'Unsupported vehicle type' });
  }
  if (!brand || !brand.trim()) {
    return res.status(400).json({ error: 'Brand is required' });
  }
  if (!model || !model.trim()) {
    return res.status(400).json({ error: 'Model is required' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO Vehicle (user_id, license_plate, vehicle_type, brand, model, color) VALUES (?, ?, ?, ?, ?, ?)',
      [
        user_id,
        plate,
        vehicle_type || null,
        brand.trim(),
        model.trim(),
        color && color.trim() ? color.trim() : null
      ]
    );
    res.json({ vehicle_id: result.insertId, message: 'Vehicle added successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'License plate already registered' });
    }
    console.error('POST /vehicles failed:', err);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user_id = req.session.user.user_id;
  if (!isPositiveIntString(id)) {
    return res.status(400).json({ error: 'Invalid vehicle id' });
  }
  try {
    // Block delete if any active reservation references this vehicle
    const [active] = await pool.execute(
      `SELECT COUNT(*) AS active_count
       FROM Reservation
       WHERE vehicle_id = ? AND user_id = ? AND reservation_status = 'active'`,
      [id, user_id]
    );
    if (active[0].active_count > 0) {
      return res.status(400).json({
        error: 'Cannot remove a vehicle with active reservations. Cancel or check out first.'
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM Vehicle WHERE vehicle_id = ? AND user_id = ?',
      [id, user_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle removed successfully' });
  } catch (err) {
    console.error('DELETE /vehicles/:id failed:', err);
    res.status(500).json({ error: 'Failed to remove vehicle' });
  }
});

module.exports = router;
