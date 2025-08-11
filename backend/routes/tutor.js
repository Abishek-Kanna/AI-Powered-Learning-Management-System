const express = require('express');
const router = express.Router();
const { triggerTutor, getTutorExplanations } = require('../services/tutorService');

router.post('/trigger', express.json(), (req, res) => {
  try {
    triggerTutor(req.body)
      .then(result => res.json(result))
      .catch(error => res.status(500).json({ error: error.message }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/explanations/:pdfName', (req, res) => {
  try {
    const result = getTutorExplanations(req.params.pdfName);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;