import express from 'express';
import bcrypt from 'bcryptjs';
import { getPool } from '../db/pool.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = getPool();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, passwordHash, name || email]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.' 
      });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    // Check if it's a database connection error
    if (error.code === 'ECONNREFUSED' || error.code === '28P01' || error.message?.includes('password authentication')) {
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your database configuration.' 
      });
    }
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
