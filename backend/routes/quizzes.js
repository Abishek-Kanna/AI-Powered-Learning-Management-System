const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { upload } = require('../middlewares/uploadMiddleware');
const { generateQuiz, getQuiz, getQuizList } = require('../services/quizService');

router.post('/generate', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await generateQuiz(req.file.path);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:category/:pdfName', (req, res) => {
  try {
    const quiz = getQuiz(req.params.category, req.params.pdfName);
    res.json(quiz);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/list/:category', (req, res) => {
  try {
    const quizzes = getQuizList(req.params.category);
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;