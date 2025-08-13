const express = require('express');
const router = express.Router();
const { 
  saveStudySession,
  getUserQuizStats,
  getUserFlashcardStats,
  getUserActivityStats,
  getUserDetailedHistory
} = require('../services/sessionService');

// This route now receives the data from the frontend and saves it.
router.post('/study-session', express.json(), async (req, res) => {
  try {
    // Added a log to confirm the request is received
    console.log('✅ Received request to save study session:', req.body); 
    const result = await saveStudySession(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Failed to save study session:', error);
    res.status(500).json({ error: 'Failed to save session.', details: error.message });
  }
});

// --- GET ROUTES for fetching stats ---
router.get('/quiz-stats/:userId', async (req, res) => {
  try {
    const stats = await getUserQuizStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/flashcard-stats/:userId', async (req, res) => {
  try {
    const stats = await getUserFlashcardStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/activity-stats/:userId', async (req, res) => {
  try {
    const stats = await getUserActivityStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/detailed-history/:userId', async (req, res) => {
  try {
    const history = await getUserDetailedHistory(req.params.userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;