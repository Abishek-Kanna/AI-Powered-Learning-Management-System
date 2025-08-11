const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Material = require('../models/Material');

router.get('/materials/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const materials = await Material.find({ subject, status: 'completed' });
    
    const files = materials.map(m => ({
      name: m.originalName,
      path: m.filename,
      uploadDate: m.createdAt,
    }));

    res.status(200).json({ files });
  } catch (error) {
    console.error(`Error fetching materials for ${req.params.subject}:`, error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.get('/materials/file/:subject/:filename', (req, res) => {
  try {
    const { subject, filename } = req.params;
    const filePath = path.join(__dirname, `../input_pdfs/${subject}`, filename);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'File not found.' });
    }
  } catch (error) {
    console.error(`Error serving file ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

router.get('/quizzes/:subject', async (req, res) => {
    try {
        const { subject } = req.params;
        const materials = await Material.find({ subject, status: 'completed' });
        const quizzes = materials.map(m => ({ name: m.originalName }));
        res.status(200).json({ quizzes });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quiz list' });
    }
});

router.get('/quizzes/:subject/:quizName', async (req, res) => {
    try {
        const { quizName } = req.params;
        const material = await Material.findOne({ originalName: quizName, status: 'completed' });
        if (!material) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        res.status(200).json(material.quiz_content);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quiz data' });
    }
});

module.exports = router;