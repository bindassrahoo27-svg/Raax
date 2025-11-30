const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // Increased limit for API
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-app.render.com', 'https://your-android-app.com'],
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Test Firebase connection
try {
  const { db } = require('./config/firebase');
  console.log('🔥 Firebase connection test passed');
} catch (error) {
  console.error('🔥 Firebase connection failed:', error.message);
}

// Import routes
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const hadithRoutes = require('./routes/hadith');
const quranRoutes = require('./routes/quran');
const prayerRoutes = require('./routes/prayer');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/hadith', hadithRoutes);
app.use('/api/quran', quranRoutes);
app.use('/api/prayer', prayerRoutes);

// Health check endpoint with Firebase test
app.get('/api/health', async (req, res) => {
  try {
    const { db } = require('./config/firebase');
    
    // Test database connection
    await db.ref('.info/connected').once('value');
    
    res.status(200).json({
      status: 'success',
      message: 'Islamic Community API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(200).json({
      status: 'success',
      message: 'Islamic Community API is running',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Islamic Community API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /register': 'Register new user',
        'POST /login': 'Login user',
        'GET /profile': 'Get user profile (Auth required)'
      },
      videos: {
        'GET /': 'Get all videos',
        'GET /latest': 'Get latest videos',
        'POST /': 'Add video (Admin)'
      },
      hadith: {
        'GET /': 'Get all hadith',
        'GET /daily': 'Get daily hadith',
        'POST /': 'Add hadith (Admin)'
      },
      quran: {
        'GET /surahs': 'Get all Surahs',
        'GET /surahs/:number': 'Get specific Surah',
        'GET /audio/:reciter/:surah': 'Get audio URL'
      },
      prayer: {
        'GET /times': 'Get prayer times by city',
        'GET /guide': 'Get prayer guide'
      }
    },
    documentation: 'Add your documentation URL here'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.redirect('/api');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      error: error.message,
      stack: error.stack 
    })
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Islamic Community API running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
