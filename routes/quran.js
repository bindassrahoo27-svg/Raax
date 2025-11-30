const express = require('express');
const axios = require('axios');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all Surahs
router.get('/surahs', optionalAuth, async (req, res) => {
  try {
    const response = await axios.get('https://api.alquran.cloud/v1/surah');
    
    if (response.data.code !== 200) {
      throw new Error('Failed to fetch Quran data');
    }

    res.json({
      status: 'success',
      data: response.data.data
    });
  } catch (error) {
    console.error('Get surahs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Quran surahs'
    });
  }
});

// Get specific Surah by number
router.get('/surahs/:number', optionalAuth, async (req, res) => {
  try {
    const { number } = req.params;
    const { edition = 'quran-simple' } = req.query;

    const response = await axios.get(
      `https://api.alquran.cloud/v1/surah/${number}/${edition}`
    );

    if (response.data.code !== 200) {
      throw new Error('Failed to fetch Surah data');
    }

    res.json({
      status: 'success',
      data: response.data.data
    });
  } catch (error) {
    console.error('Get surah error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Surah'
    });
  }
});

// Get specific Ayah
router.get('/ayah/:surah/:ayah', optionalAuth, async (req, res) => {
  try {
    const { surah, ayah } = req.params;
    const { edition = 'quran-simple' } = req.query;

    const response = await axios.get(
      `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/${edition}`
    );

    if (response.data.code !== 200) {
      throw new Error('Failed to fetch Ayah data');
    }

    res.json({
      status: 'success',
      data: response.data.data
    });
  } catch (error) {
    console.error('Get ayah error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Ayah'
    });
  }
});

// Search Quran
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { query, language = 'en' } = req.query;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    const response = await axios.get(
      `https://api.alquran.cloud/v1/search/${query}/all/${language}`
    );

    if (response.data.code !== 200) {
      throw new Error('Failed to search Quran');
    }

    res.json({
      status: 'success',
      data: response.data.data
    });
  } catch (error) {
    console.error('Search Quran error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search Quran'
    });
  }
});

// Get Quran audio
router.get('/audio/:reciter/:surah', optionalAuth, async (req, res) => {
  try {
    const { reciter, surah } = req.params;

    // List of popular reciters
    const reciters = {
      'mishari': 'mishaari_raashid_al_3afaasee',
      'abdulbaset': 'abdulbaset_abdulsamad',
      'hudhaify': 'hudhaify',
      'shatri': 'abu_bakr_ash-shatree'
    };

    const reciterId = reciters[reciter] || reciters['mishari'];

    const audioUrl = `https://download.quranicaudio.com/quran/${reciterId}/${surah}.mp3`;

    res.json({
      status: 'success',
      data: {
        audioUrl,
        reciter: reciterId,
        surah: parseInt(surah)
      }
    });
  } catch (error) {
    console.error('Get audio error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get audio URL'
    });
  }
});

// Get Juz (Para) information
router.get('/juz/:number', optionalAuth, async (req, res) => {
  try {
    const { number } = req.params;

    const response = await axios.get(
      `https://api.alquran.cloud/v1/juz/${number}/quran-uthmani`
    );

    if (response.data.code !== 200) {
      throw new Error('Failed to fetch Juz data');
    }

    res.json({
      status: 'success',
      data: response.data.data
    });
  } catch (error) {
    console.error('Get juz error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Juz'
    });
  }
});

module.exports = router;
