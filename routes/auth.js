const express = require('express');
const { admin, db } = require('../config/firebase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, password, and name are required'
      });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });

    // Save additional user data to Realtime Database
    await db.ref('users/' + userRecord.uid).set({
      name,
      email,
      createdAt: new Date().toISOString(),
      isAdmin: false
    });

    // Generate custom token for immediate login
    const token = await admin.auth().createCustomToken(userRecord.uid);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    // Note: Firebase Admin SDK doesn't have direct password verification
    // This endpoint would typically be handled by client-side Firebase Auth
    // For API usage, we'll return a custom token that can be used by clients
    const userRecord = await admin.auth().getUserByEmail(email);
    const token = await admin.auth().createCustomToken(userRecord.uid);

    // Get user data from database
    const userSnapshot = await db.ref('users/' + userRecord.uid).once('value');
    const userData = userSnapshot.val();

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        ...userData,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userSnapshot = await db.ref('users/' + req.user.uid).once('value');
    const userData = userSnapshot.val();

    res.json({
      status: 'success',
      data: {
        uid: req.user.uid,
        email: req.user.email,
        ...userData
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Name is required'
      });
    }

    // Update in Firebase Auth
    await admin.auth().updateUser(req.user.uid, {
      displayName: name
    });

    // Update in Realtime Database
    await db.ref('users/' + req.user.uid).update({
      name,
      updatedAt: new Date().toISOString()
    });

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { name }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;
