const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { PYTHON_PATH } = require('../config');
const Material = require('../models/Material');

const USER_ANSWERS_DIR = path.join(__dirname, '../user_answers');
const TUTOR_EXPLANATIONS_DIR = path.join(__dirname, '../pages/tutor_explanations');

router.post('/trigger', async (req, res) => {
  const { quizName, userAnswers, subject } = req.body;

  if (!quizName || !userAnswers || !subject) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  try {
    const material = await Material.findOne({ originalName: quizName, subject }).sort({ createdAt: -1 });
    if (!material) {
        return res.status(404).json({ error: 'Material not found in database.' });
    }
    
    const quizFilePath = path.join(__dirname, `../pages/generated_quizzes/${subject}/${path.parse(material.filename).name}_quiz.json`);
    const answersFilePath = path.join(USER_ANSWERS_DIR, `${material._id}_answers.json`);
    await fs.mkdir(USER_ANSWERS_DIR, { recursive: true });
    await fs.writeFile(answersFilePath, JSON.stringify({ quizName, answers: userAnswers }, null, 2));

    const pythonScriptPath = path.resolve(__dirname, '../pages/ai_tutor.py');
    const pythonProcess = spawn(PYTHON_PATH, [pythonScriptPath, material._id.toString(), answersFilePath]);

    pythonProcess.stdout.on('data', (data) => console.log(`[AI Tutor STDOUT]: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[AI Tutor STDERR]: ${data}`));
    pythonProcess.on('exit', (code) => console.log(`ai_tutor.py exited with code ${code}`));

    res.status(202).json({ message: 'AI Tutor processing initiated.' });
  } catch (error) {
    console.error('Error triggering AI tutor:', error);
    res.status(500).json({ error: 'Failed to start AI tutor process.' });
  }
});

// --- FINAL UPDATED LOGIC ---
router.get('/explanations/:quizName', async (req, res) => {
    const { quizName } = req.params;
    try {
        const material = await Material.findOne({ originalName: quizName }).sort({ createdAt: -1 });
        if (!material) {
            return res.status(404).json({ error: 'Material not found.' });
        }
        
        const baseName = path.parse(material.filename).name;
        const explanationFilePath = path.join(TUTOR_EXPLANATIONS_DIR, `${baseName}_tutor_explanations.json`);

        // Directly try to read the file. If it fails, the catch block will handle it.
        const data = await fs.readFile(explanationFilePath, 'utf-8');
        res.status(200).json(JSON.parse(data));

    } catch (error) {
        if (error.code === 'ENOENT') {
            // This error code means "File Not Found", which is expected while polling.
            res.status(404).json({ error: 'Explanations not found yet. Please wait.' });
        } else {
            // For any other unexpected errors.
            console.error('Error fetching explanations:', error);
            res.status(500).json({ error: 'Failed to fetch explanations.' });
        }
    }
});

module.exports = router;