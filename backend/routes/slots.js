const express = require('express');
const pool = require('../db');

const router = express.Router();

// Query type 2 - SELECT with JOIN + optional dynamic filters
router.get('/slots', async (req, res) => {
  const { status, lot_id } = req.query;
  let query = `
    SELECT ps.slot_id, ps.slot_number, ps.slot_type, ps.availability_status, ps.lot_id,
           pl.lot_name, pl.location
    FROM ParkingSlot ps
    JOIN ParkingLot pl ON ps.lot_id = pl.lot_id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    if (!['available', 'unavailable'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }
    query += ' AND ps.availability_status = ?';
    params.push(status);
  }
  if (lot_id) {
    if (!Number.isInteger(Number(lot_id))) {
      return res.status(400).json({ error: 'Invalid lot_id filter' });
    }
    query += ' AND ps.lot_id = ?';
    params.push(lot_id);
  }
  query += ' ORDER BY pl.lot_name, ps.slot_number';
  try {
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /slots failed:', err);
    res.status(500).json({ error: 'Failed to load slots' });
  }
});

// Query type 3 - SELECT with COUNT + GROUP BY (lots with available-slot counts)
router.get('/lots', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        pl.lot_id,
        pl.lot_name,
        pl.location,
        pl.opening_time,
        pl.closing_time,
        COUNT(CASE WHEN ps.availability_status = 'available' THEN 1 END) AS available_slots,
        COUNT(ps.slot_id) AS total_slots
      FROM ParkingLot pl
      LEFT JOIN ParkingSlot ps ON pl.lot_id = ps.lot_id
      GROUP BY pl.lot_id, pl.lot_name, pl.location, pl.opening_time, pl.closing_time
      ORDER BY pl.lot_name
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /lots failed:', err);
    res.status(500).json({ error: 'Failed to load parking lots' });
  }
});

module.exports = router;
