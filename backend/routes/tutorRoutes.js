const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PYTHON_PATH } = require('../config');
const Material = require('../models/Material');

const USER_ANSWERS_DIR = path.join(__dirname, '../user_answers_temp');
const TUTOR_EXPLANATIONS_DIR = path.join(__dirname, '../pages/tutor_explanations');

// This route triggers a new AI Tutor session. It remains unchanged.
router.post('/trigger', async (req, res) => {
  const { quizName, userAnswers, subject, userId } = req.body;

  if (!quizName || !userAnswers || !subject || !userId) {
    return res.status(400).json({ error: 'Missing required data, including userId' });
  }

  try {
    const material = await Material.findOne({ originalName: quizName, subject }).sort({ createdAt: -1 });
    if (!material) {
        return res.status(404).json({ error: 'Material not found in database.' });
    }
    
    const attemptId = Date.now().toString();

    const userExplanationDir = path.join(TUTOR_EXPLANATIONS_DIR, userId);
    await fs.promises.mkdir(userExplanationDir, { recursive: true });

    const tempAnswersPath = path.join(USER_ANSWERS_DIR, `${material._id}_${attemptId}_answers.json`);
    await fs.promises.mkdir(USER_ANSWERS_DIR, { recursive: true });
    await fs.promises.writeFile(tempAnswersPath, JSON.stringify({ quizName, answers: userAnswers }, null, 2));
    
    const pythonScriptPath = path.resolve(__dirname, '../pages/ai_tutor.py');
    
    const pythonProcess = spawn(PYTHON_PATH, [
      pythonScriptPath,
      material._id.toString(),
      tempAnswersPath,
      attemptId,
      userId
    ]);

    pythonProcess.stdout.on('data', (data) => console.log(`[AI Tutor STDOUT]: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[AI Tutor STDERR]: ${data}`));
    pythonProcess.on('exit', async (code) => {
        console.log(`ai_tutor.py exited with code ${code}`);
        try {
            await fs.promises.unlink(tempAnswersPath);
        } catch (err) {
            console.error('Failed to clean up temp answer file:', err);
        }
    });

    res.status(202).json({ message: 'AI Tutor processing initiated.', attemptId });

  } catch (error) {
    console.error('Error triggering AI tutor:', error);
    res.status(500).json({ error: 'Failed to start AI tutor process.' });
  }
});

// This route polls for the result of a specific attempt. It remains unchanged.
router.get('/explanations/:userId/:quizName/:attemptId', async (req, res) => {
    const { userId, quizName, attemptId } = req.params;
    try {
        const material = await Material.findOne({ originalName: quizName }).sort({ createdAt: -1 });
        if (!material) {
            return res.status(404).json({ error: 'Material not found.' });
        }
        
        const baseName = path.parse(material.filename).name;
        const explanationFilePath = path.join(TUTOR_EXPLANATIONS_DIR, userId, `${baseName}_${attemptId}_tutor_explanations.json`);

        const data = await fs.promises.readFile(explanationFilePath, 'utf-8');
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

// --- NEW ROUTES FOR HISTORY PAGE ---

// ROUTE 1: Gets a list of all explanation sessions for a given user.
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userExplanationDir = path.join(TUTOR_EXPLANATIONS_DIR, userId);

    if (!fs.existsSync(userExplanationDir)) {
      return res.json([]); // Return empty array if user has no history
    }

    const files = await fs.promises.readdir(userExplanationDir);
    
    const history = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const parts = file.split('_');
        const attemptId = parts[parts.length - 3];
        const quizName = parts.slice(1, -3).join(' ');
        
        return {
          filename: file,
          quizName: quizName || 'Quiz Session',
          date: new Date(parseInt(attemptId)).toLocaleString(),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching tutor history:', error);
    res.status(500).json({ error: 'Failed to fetch tutor history.' });
  }
});

// ROUTE 2: Gets the detailed content of a specific explanation file from the user's history.
router.get('/history/:userId/:filename', async (req, res) => {
  try {
    const { userId, filename } = req.params;
    const filePath = path.join(TUTOR_EXPLANATIONS_DIR, userId, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Explanation file not found.' });
    }

    const data = await fs.promises.readFile(filePath, 'utf-8');
    res.status(200).json(JSON.parse(data));
  } catch (error) {
    console.error('Error fetching explanation file:', error);
    res.status(500).json({ error: 'Failed to fetch explanation file.' });
  }
});


module.exports = router;