const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all hadith with pagination
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const snapshot = await db.ref('hadith')
      .orderByChild('createdAt')
      .once('value');

    if (!snapshot.exists()) {
      return res.json({
        status: 'success',
        data: {
          hadiths: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0
          }
        }
      });
    }

    const hadiths = [];
    snapshot.forEach((childSnapshot) => {
      hadiths.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Reverse to get newest first and apply pagination
    const reversedHadiths = hadiths.reverse();
    const paginatedHadiths = reversedHadiths.slice(offset, offset + limitNum);

    res.json({
      status: 'success',
      data: {
        hadiths: paginatedHadiths,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: hadiths.length,
          pages: Math.ceil(hadiths.length / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get hadith error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hadith collection'
    });
  }
});

// Get hadith of the day
router.get('/daily', optionalAuth, async (req, res) => {
  try {
    const snapshot = await db.ref('hadith')
      .orderByChild('createdAt')
      .limitToLast(1)
      .once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        status: 'error',
        message: 'No hadith available'
      });
    }

    let hadith = null;
    snapshot.forEach((childSnapshot) => {
      hadith = {
        id: childSnapshot.key,
        ...childSnapshot.val()
      };
    });

    res.json({
      status: 'success',
      data: hadith
    });
  } catch (error) {
    console.error('Get daily hadith error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch daily hadith'
    });
  }
});

// Get random hadith
router.get('/random', optionalAuth, async (req, res) => {
  try {
    const snapshot = await db.ref('hadith').once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        status: 'error',
        message: 'No hadith available'
      });
    }

    const hadiths = [];
    snapshot.forEach((childSnapshot) => {
      hadiths.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    const randomHadith = hadiths[Math.floor(Math.random() * hadiths.length)];

    res.json({
      status: 'success',
      data: randomHadith
    });
  } catch (error) {
    console.error('Get random hadith error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch random hadith'
    });
  }
});

// Get single hadith by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref('hadith/' + id).once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        status: 'error',
        message: 'Hadith not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        id,
        ...snapshot.val()
      }
    });
  } catch (error) {
    console.error('Get hadith error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hadith'
    });
  }
});

// Add new hadith (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, text, reference, category = 'general' } = req.body;

    if (!title || !text || !reference) {
      return res.status(400).json({
        status: 'error',
        message: 'Title, text, and reference are required'
      });
    }

    // Check if user is admin
    const userSnapshot = await db.ref('users/' + req.user.uid).once('value');
    const userData = userSnapshot.val();

    if (!userData || !userData.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    const hadithData = {
      title,
      text,
      reference,
      category,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const newHadithRef = await db.ref('hadith').push(hadithData);

    res.status(201).json({
      status: 'success',
      message: 'Hadith added successfully',
      data: {
        id: newHadithRef.key,
        ...hadithData
      }
    });
  } catch (error) {
    console.error('Add hadith error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add hadith'
    });
  }
});

// Update hadith (Admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text, reference, category } = req.body;

    // Check if hadith exists
    const hadithSnapshot = await db.ref('hadith/' + id).once('value');
    if (!hadithSnapshot.exists()) {
      return res.status(404).json({
        status: 'error',
        message: 'Hadith not found'
      });
    }

    // Check if user is admin
    const userSnapshot = await db.ref('users/' + req.user.uid).once('value');
    const userData = userSnapshot.val();

    if (!userData || !userData.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };

    if (title) updateData.title = title;
    if (text) updateData.text = text;
    if (reference) updateData.reference = reference;
    if (category) updateData.category = category;

    await db.ref('hadith/' + id).update(updateData);

    res.json({
      status: 'success',
      message: 'Hadith updated successfully',
      data: { id, ...updateData }
    });
  } catch (error) {
    console.error('Update hadith error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update hadith'
    });
  }
});

// Delete hadith (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if hadith exists
    const hadithSnapshot = await db.ref('hadith/' + id).once('value');
    if (!hadithSnapshot.exists()) {
      return res.status(404).json({
        status: 'error',
        message: 'Hadith not found'
      });
    }

    // Check if user is admin
    const userSnapshot = await db.ref('users/' + req.user.uid).once('value');
    const userData = userSnapshot.val();

    if (!userData || !userData.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    await db.ref('hadith/' + id).remove();

    res.json({
      status: 'success',
      message: 'Hadith deleted successfully'
    });
  } catch (error) {
    console.error('Delete hadith error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete hadith'
    });
  }
});

module.exports = router;
