const express = require('express');
const router = express.Router();
const { getFlashcardList, getFlashcards } = require('../services/flashcardService');

router.get('/:category', (req, res) => {
  try {
    const result = getFlashcardList(req.params.category);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:category/:flashcardName', (req, res) => {
  try {
    const result = getFlashcards(req.params.category, req.params.flashcardName);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;