// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Config from env or defaults
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_strong_secret';
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

// DB file in working directory (on Render use persistent disk if available)
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.sqlite3');

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Failed open DB:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite DB:', DB_FILE);
});

// Create users table if not exists
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL
    )`,
    (err) => {
      if (err) console.error('Create table error:', err);
      else console.log('Users table ready');
    }
  );
});

// Helper: create JWT
function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware: authenticate
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ status: 'error', message: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ status: 'error', message: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

// Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Auth API running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'email and password required' });
    }
    // basic email lowercase
    const normalizedEmail = String(email).trim().toLowerCase();

    // check if exists
    db.get('SELECT id FROM users WHERE email = ?', [normalizedEmail], async (err, row) => {
      if (err) {
        console.error('DB error', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (row) {
        return res.status(400).json({ status: 'error', message: 'Email already registered' });
      }

      // hash password
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      const id = uuidv4();
      const createdAt = new Date().toISOString();

      db.run(
        'INSERT INTO users (id, email, password, name, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, normalizedEmail, hash, name || null, createdAt],
        function (insertErr) {
          if (insertErr) {
            console.error('Insert error', insertErr);
            return res.status(500).json({ status: 'error', message: 'Failed to create user' });
          }

          const token = createToken({ id, email: normalizedEmail });
          return res.json({
            status: 'success',
            message: 'User registered',
            user: { id, email: normalizedEmail, name: name || null, created_at: createdAt },
            token
          });
        }
      );
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'email and password required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    db.get('SELECT id, email, password, name, created_at FROM users WHERE email = ?', [normalizedEmail], async (err, user) => {
      if (err) {
        console.error('DB error', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }

      const token = createToken({ id: user.id, email: user.email });
      return res.json({
        status: 'success',
        message: 'Login successful',
        user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
        token
      });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// Protected route example
app.get('/api/me', authenticate, (req, res) => {
  const id = req.user.id;
  db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'success', user });
  });
});

// Simple logout (client should discard token) — optionally you can implement token blacklist
app.post('/api/logout', (req, res) => {
  res.json({ status: 'success', message: 'Logout: discard token on client' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
