const express = require('express');
const axios = require('axios');
const { db } = require('../config/firebase');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get prayer times by location
router.get('/times', optionalAuth, async (req, res) => {
  try {
    const { city, country, method = 2 } = req.query;

    if (!city || !country) {
      return res.status(400).json({
        status: 'error',
        message: 'City and country are required'
      });
    }

    // Using Aladhan API
    const response = await axios.get(
      `http://api.aladhan.com/v1/timingsByCity`,
      {
        params: {
          city,
          country,
          method,
          school: 1 // Shafi (0 for Hanafi)
        }
      }
    );

    if (response.data.code !== 200) {
      throw new Error('Failed to fetch prayer times');
    }

    const prayerTimes = response.data.data.timings;

    // Format the response
    const formattedTimes = {
      date: response.data.data.date.readable,
      fajr: prayerTimes.Fajr,
      sunrise: prayerTimes.Sunrise,
      dhuhr: prayerTimes.Dhuhr,
      asr: prayerTimes.Asr,
      maghrib: prayerTimes.Maghrib,
      isha: prayerTimes.Isha,
      location: `${city}, ${country}`
    };

    res.json({
      status: 'success',
      data: formattedTimes
    });
  } catch (error) {
    console.error('Get prayer times error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch prayer times'
    });
  }
});

// Get prayer times by coordinates
router.get('/times/coordinates', optionalAuth, async (req, res) => {
  try {
    const { latitude, longitude, method = 2 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required'
      });
    }

    const response = await axios.get(
      `http://api.aladhan.com/v1/timings`,
      {
        params: {
          latitude,
          longitude,
          method,
          school: 1
        }
      }
    );

    if (response.data.code !== 200) {
      throw new Error('Failed to fetch prayer times');
    }

    const prayerTimes = response.data.data.timings;

    const formattedTimes = {
      date: response.data.data.date.readable,
      fajr: prayerTimes.Fajr,
      sunrise: prayerTimes.Sunrise,
      dhuhr: prayerTimes.Dhuhr,
      asr: prayerTimes.Asr,
      maghrib: prayerTimes.Maghrib,
      isha: prayerTimes.Isha,
      location: `Lat: ${latitude}, Long: ${longitude}`
    };

    res.json({
      status: 'success',
      data: formattedTimes
    });
  } catch (error) {
    console.error('Get prayer times by coordinates error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch prayer times'
    });
  }
});

// Save user prayer times preferences
router.post('/preferences', authenticateToken, async (req, res) => {
  try {
    const { city, country, calculationMethod, notifications } = req.body;

    const preferences = {
      city,
      country,
      calculationMethod: calculationMethod || 2,
      notifications: notifications || {},
      updatedAt: new Date().toISOString()
    };

    await db.ref('prayer_preferences/' + req.user.uid).set(preferences);

    res.json({
      status: 'success',
      message: 'Prayer preferences saved',
      data: preferences
    });
  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save prayer preferences'
    });
  }
});

// Get user prayer preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.ref('prayer_preferences/' + req.user.uid).once('value');
    
    const preferences = snapshot.exists() ? snapshot.val() : {
      city: '',
      country: '',
      calculationMethod: 2,
      notifications: {}
    };

    res.json({
      status: 'success',
      data: preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch prayer preferences'
    });
  }
});

// Get prayer guide
router.get('/guide', optionalAuth, async (req, res) => {
  try {
    const prayerGuide = {
      title: "How to Perform Salah (Prayer)",
      steps: [
        {
          step: 1,
          title: "Make Wudu (Ablution)",
          description: "Perform the ritual washing before prayer.",
          details: "Wash hands, mouth, nose, face, arms, head, ears, and feet in specific order."
        },
        {
          step: 2,
          title: "Face the Qibla",
          description: "Turn towards the Kaaba in Mecca.",
          details: "Use a compass or mobile app to find the correct direction."
        },
        {
          step: 3,
          title: "Make Niyyah (Intention)",
          description: "Silently state your intention to pray.",
          details: "The intention should be in your heart for which prayer you are performing."
        },
        {
          step: 4,
          title: "Takbir",
          description: "Raise your hands and say 'Allahu Akbar' (God is Great).",
          details: "Hands should be raised to shoulder level with palms facing forward."
        },
        {
          step: 5,
          title: "Recite Surah Al-Fatihah",
          description: "Recite the opening chapter of the Quran.",
          details: "This is obligatory in every rakat of every prayer."
        },
        {
          step: 6,
          title: "Perform Ruku (Bowing)",
          description: "Bow down with your hands on your knees.",
          details: "Keep your back straight and say 'Subhana Rabbiyal Adheem' three times."
        },
        {
          step: 7,
          title: "Perform Sujud (Prostration)",
          description: "Place your forehead, nose, hands, knees, and toes on the ground.",
          details: "Say 'Subhana Rabbiyal A'la' three times while in prostration."
        }
      ],
      importantNotes: [
        "Prayer must be performed in Arabic",
        "Women have some variations in prayer postures",
        "Prayer times vary based on location and season",
        "Make up missed prayers as soon as possible"
      ]
    };

    res.json({
      status: 'success',
      data: prayerGuide
    });
  } catch (error) {
    console.error('Get prayer guide error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch prayer guide'
    });
  }
});

module.exports = router;
