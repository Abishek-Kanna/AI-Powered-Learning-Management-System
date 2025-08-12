const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { PYTHON_PATH } = require('../config');
const Material = require('../models/Material');

const USER_ANSWERS_DIR = path.join(__dirname, '../user_answers');
const TUTOR_EXPLANATIONS_DIR = path.join(__dirname, '../tutor_explanations');

router.post('/trigger', async (req, res) => {
  const { quizName, userAnswers, subject } = req.body;

  if (!quizName || !userAnswers || !subject) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  try {
    const material = await Material.findOne({ originalName: quizName, subject }).sort({ createdAt: -1 }); //
    if (!material) {
        return res.status(404).json({ error: 'Material not found in database.' });
    }
    
    // --- CHANGE 1: Generate a unique ID for this attempt ---
    const attemptId = Date.now().toString();

    // --- CHANGE 2: Use the attemptId in the answers filename ---
    const answersFilePath = path.join(USER_ANSWERS_DIR, `${material._id}_${attemptId}_answers.json`);
    await fs.mkdir(USER_ANSWERS_DIR, { recursive: true });
    await fs.writeFile(answersFilePath, JSON.stringify({ quizName, answers: userAnswers }, null, 2));

    const pythonScriptPath = path.resolve(__dirname, '../pages/ai_tutor.py');
    
    // --- CHANGE 3: Pass the attemptId to the Python script ---
    const pythonProcess = spawn(PYTHON_PATH, [pythonScriptPath, material._id.toString(), answersFilePath, attemptId]); //

    pythonProcess.stdout.on('data', (data) => console.log(`[AI Tutor STDOUT]: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[AI Tutor STDERR]: ${data}`));
    pythonProcess.on('exit', (code) => console.log(`ai_tutor.py exited with code ${code}`));

    // --- CHANGE 4: Return the attemptId to the frontend ---
    res.status(202).json({ message: 'AI Tutor processing initiated.', attemptId: attemptId }); //

  } catch (error) {
    console.error('Error triggering AI tutor:', error);
    res.status(500).json({ error: 'Failed to start AI tutor process.' });
  }
});

// --- CHANGE 5: Update the route to include the attemptId ---
router.get('/explanations/:quizName/:attemptId', async (req, res) => {
    const { quizName, attemptId } = req.params;
    try {
        const material = await Material.findOne({ originalName: quizName }).sort({ createdAt: -1 }); //
        if (!material) {
            return res.status(404).json({ error: 'Material not found.' });
        }
        
        const baseName = path.parse(material.filename).name; //
        // --- CHANGE 6: Use the attemptId to find the correct explanation file ---
        const explanationFilePath = path.join(TUTOR_EXPLANATIONS_DIR, `${baseName}_${attemptId}_tutor_explanations.json`);

        const data = await fs.readFile(explanationFilePath, 'utf-8');
        res.status(200).json(JSON.parse(data));

    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Explanations not found yet. Please wait.' });
        } else {
            console.error('Error fetching explanations:', error);
            res.status(500).json({ error: 'Failed to fetch explanations.' });
        }
    }
});

module.exports = router;