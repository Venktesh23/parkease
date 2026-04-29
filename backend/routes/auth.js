const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { first_name, last_name, email, phone, password, confirmPassword } = req.body;

  // Validation
  if (!first_name || first_name.trim().length < 2) {
    return res.status(400).json({ error: 'First name must be at least 2 characters' });
  }
  if (!last_name || last_name.trim().length < 2) {
    return res.status(400).json({ error: 'Last name must be at least 2 characters' });
  }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (phone && phone.trim()) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT user_id FROM User WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      'INSERT INTO User (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [
        first_name.trim(),
        last_name.trim(),
        email.trim().toLowerCase(),
        phone && phone.trim() ? phone.trim() : null,
        hashedPassword,
        'customer'
      ]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM User WHERE user_id = ?',
      [result.insertId]
    );
    const user = rows[0];

    req.session.user = {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role
    };

    return res.status(201).json({
      user: req.session.user,
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Database error, please try again' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM User WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.user = {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role
    };
    return res.json({
      user: req.session.user,
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Database error, please try again' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Session error, please try again' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ user: req.session.user });
});

module.exports = router;
