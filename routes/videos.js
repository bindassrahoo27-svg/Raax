const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all videos with pagination
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let videosRef = db.ref('videos').orderByChild('createdAt');

    // Apply category filter if provided
    if (category) {
      videosRef = videosRef.equalTo(category, 'category');
    }

    const snapshot = await videosRef.once('value');
    
    if (!snapshot.exists()) {
      return res.json({
        status: 'success',
        data: {
          videos: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0
          }
        }
      });
    }

    const videos = [];
    snapshot.forEach((childSnapshot) => {
      videos.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Reverse to get newest first and apply pagination
    const reversedVideos = videos.reverse();
    const paginatedVideos = reversedVideos.slice(offset, offset + limitNum);

    res.json({
      status: 'success',
      data: {
        videos: paginatedVideos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: videos.length,
          pages: Math.ceil(videos.length / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch videos'
    });
  }
});

// Get latest videos for home page
router.get('/latest', optionalAuth, async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    const limitNum = parseInt(limit);

    const snapshot = await db.ref('videos')
      .orderByChild('createdAt')
      .limitToLast(limitNum)
      .once('value');

    if (!snapshot.exists()) {
      return res.json({
        status: 'success',
        data: []
      });
    }

    const videos = [];
    snapshot.forEach((childSnapshot) => {
      videos.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Reverse to get newest first
    res.json({
      status: 'success',
      data: videos.reverse()
    });
  } catch (error) {
    console.error('Get latest videos error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch latest videos'
    });
  }
});

// Get single video by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref('videos/' + id).once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        status: 'error',
        message: 'Video not found'
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
    console.error('Get video error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch video'
    });
  }
});

// Add new video (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, url, category = 'general' } = req.body;

    if (!title || !description || !url) {
      return res.status(400).json({
        status: 'error',
        message: 'Title, description, and URL are required'
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

    const videoData = {
      title,
      description,
      url,
      category,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const newVideoRef = await db.ref('videos').push(videoData);

    res.status(201).json({
      status: 'success',
      message: 'Video added successfully',
      data: {
        id: newVideoRef.key,
        ...videoData
      }
    });
  } catch (error) {
    console.error('Add video error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add video'
    });
  }
});

// Update video (Admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, category } = req.body;

    // Check if video exists
    const videoSnapshot = await db.ref('videos/' + id).once('value');
    if (!videoSnapshot.exists()) {
      return res.status(404).json({
        status: 'error',
        message: 'Video not found'
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
    if (description) updateData.description = description;
    if (url) updateData.url = url;
    if (category) updateData.category = category;

    await db.ref('videos/' + id).update(updateData);

    res.json({
      status: 'success',
      message: 'Video updated successfully',
      data: { id, ...updateData }
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update video'
    });
  }
});

// Delete video (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if video exists
    const videoSnapshot = await db.ref('videos/' + id).once('value');
    if (!videoSnapshot.exists()) {
      return res.status(404).json({
        status: 'error',
        message: 'Video not found'
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

    await db.ref('videos/' + id).remove();

    res.json({
      status: 'success',
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete video'
    });
  }
});

module.exports = router;
