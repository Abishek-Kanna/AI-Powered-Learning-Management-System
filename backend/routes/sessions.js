const express = require('express');
const router = express.Router();
const { 
  saveUserAnswers, 
  saveFlashcardSession, 
  saveStudySession,
  getUserQuizStats,
  getUserFlashcardStats,
  getUserActivityStats,
  getUserDetailedHistory
} = require('../services/sessionService');

router.post('/user-answers', express.json(), (req, res) => {
  try {
    const result = saveUserAnswers(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/flashcard-session', express.json(), (req, res) => {
  try {
    const result = saveFlashcardSession(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/study-session', express.json(), (req, res) => {
  try {
    const result = saveStudySession(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/quiz-stats', (req, res) => {
  try {
    const stats = getUserQuizStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/flashcard-stats', (req, res) => {
  try {
    const stats = getUserFlashcardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/activity-stats', (req, res) => {
  try {
    const stats = getUserActivityStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/detailed-history', (req, res) => {
  try {
    const history = getUserDetailedHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;