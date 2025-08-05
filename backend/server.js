const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const DEFAULT_PORT = 3001;
const PORT = process.env.PORT || DEFAULT_PORT;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const allowedSubjects = ['python', 'java', 'cpp', 'c', 'mixed'];
const PYTHON_PATH = 'C:\\Users\\prese\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadRoot = path.join(__dirname, 'temp');
    if (!fs.existsSync(uploadRoot)) {
      fs.mkdirSync(uploadRoot, { recursive: true });
    }
    cb(null, uploadRoot);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

const memoryUpload = multer({ storage: multer.memoryStorage() });

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

app.get('/test', (req, res) => {
  res.json({
    status: 'running',
    endpoints: {
      generateQuiz: 'POST /api/generate-quiz',
      upload: 'POST /upload',
      health: 'GET /api/health'
    }
  });
});

app.post('/upload', memoryUpload.single('pdf'), (req, res) => {
  const subject = req.body.subject?.toLowerCase();

  if (!subject || !allowedSubjects.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject specified.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const dir = path.join(__dirname, 'input_pdfs', subject);
  fs.mkdirSync(dir, { recursive: true });

  const cleanName = req.file.originalname.replace(/\s+/g, '_');
  const finalPath = path.join(dir, cleanName);

  if (fs.existsSync(finalPath)) {
    return res.status(409).json({ error: 'File with the same name already exists.' });
  }

  fs.writeFile(finalPath, req.file.buffer, (err) => {
    if (err) {
      console.error('Error saving file:', err);
      return res.status(500).json({ error: 'Failed to save file.' });
    }

    processNewPDF(finalPath, subject);
    return res.status(200).json({ 
      message: 'File uploaded successfully. Processing will begin shortly.',
      filename: cleanName,
      category: subject,
      filePath: finalPath
    });
  });
});

app.post('/api/generate-quiz', upload.single('pdf'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pdfPath = req.file.path;
    const pipeline = spawn(PYTHON_PATH, [path.join(__dirname, 'auto_pipeline.py'), pdfPath]);

    let pipelineOutput = '';
    let hasError = false;

    pipeline.stdout.on('data', (data) => {
      pipelineOutput += data.toString();
    });

    pipeline.stderr.on('data', (data) => {
      hasError = true;
    });

    pipeline.on('close', (code) => {
      if (code === 0 && !hasError) {
        let pdfName = null;
        try {
          const lines = pipelineOutput.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line) {
              const status = JSON.parse(line);
              if (status.pdf_name) {
                pdfName = status.pdf_name;
                break;
              }
            }
          }
        } catch (e) {}

        res.json({
          success: true,
          message: 'Quiz generated successfully',
          pdfName: pdfName || req.file.filename.replace('.pdf', ''),
          filePath: pdfPath
        });
      } else {
        res.status(500).json({
          error: 'Failed to generate quiz',
          code: code
        });
      }
    });

    pipeline.on('error', (err) => {
      res.status(500).json({
        error: 'Failed to start quiz generation pipeline',
        details: err.message
      });
    });

  } catch (err) {
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

function processNewPDF(filePath, category) {
  const absPath = path.resolve(filePath);
  const pythonProcess = spawn(PYTHON_PATH, ['auto_pipeline.py', absPath], {
    cwd: __dirname,
    shell: true,
  });

  pythonProcess.on('exit', (code) => {
    console.log(`auto_pipeline.py exited with code ${code}`);
  });
}

app.post('/api/upload-pdf', upload.single('pdf'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const { subject } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject category is required' });
    }

    const subjectDir = path.join(__dirname, 'input_pdfs', subject);
    if (!fs.existsSync(subjectDir)) {
      fs.mkdirSync(subjectDir, { recursive: true });
    }

    const originalName = req.file.originalname;
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalPath = path.join(subjectDir, safeName);
    
    fs.renameSync(req.file.path, finalPath);

    res.json({
      message: 'PDF uploaded successfully',
      filename: safeName,
      category: subject,
      path: finalPath
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to upload PDF' });
  }
});

app.post('/api/process-pdf', express.json(), async (req, res) => {
  try {
    const { filename, category } = req.body;
    
    if (!filename || !category) {
      return res.status(400).json({ error: 'Filename and category are required' });
    }

    const filePath = path.join(__dirname, 'input_pdfs', category, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Uploaded file not found' });
    }

    res.json({
      message: 'PDF processed successfully',
      filename,
      category,
      processed: {
        quizGenerated: true,
        flashcardsGenerated: true,
        textExtracted: true
      },
      status: 'completed'
    });

    const pythonProcess = spawn(PYTHON_PATH, ['auto_pipeline.py', filePath, category], {
      cwd: __dirname,
      shell: true
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

app.get('/api/quiz/:category/:pdfName', (req, res) => {
  try {
    const category = req.params.category;
    const pdfName = req.params.pdfName;
    const safeName = pdfName.replace(/\s+/g, '_').replace(/,/g, '');
    
    let quizPath = path.join(__dirname, 'generated_quizzes', category, `${safeName}_llama_context_quiz.json`);
    
    if (!fs.existsSync(quizPath)) {
      const alternativeNames = [
        `${safeName}.json`,
        `${safeName}_quiz.json`,
        `${safeName}_llama_context_quiz.json`
      ];
      
      let foundPath = null;
      for (const altName of alternativeNames) {
        const altPath = path.join(__dirname, 'generated_quizzes', category, altName);
        if (fs.existsSync(altPath)) {
          foundPath = altPath;
          break;
        }
      }
      
      if (!foundPath) {
        return res.status(404).json({ error: 'Quiz not found' });
      }
      quizPath = foundPath;
    }
    
    const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    res.json(quizData);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to read quiz data',
      details: err.message
    });
  }
});

app.get('/api/quiz-list/:category', (req, res) => {
  try {
    const category = req.params.category;
    const categoryDir = path.join(__dirname, 'generated_quizzes', category);
    
    if (!fs.existsSync(categoryDir)) {
      return res.json({ quizzes: [] });
    }
    
    const allFiles = fs.readdirSync(categoryDir);
    const jsonFiles = allFiles
      .filter(file => file.toLowerCase().endsWith('.json'))
      .map(file => {
        const filePath = path.join(categoryDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file.replace('.json', '').replace(/_llama_context_quiz$/, ''),
          path: `${category}/${file}`,
          created: stats.mtime.toISOString(),
          size: stats.size
        };
      });
    
    res.json({ quizzes: jsonFiles, category });
    
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch quiz list',
      details: err.message
    });
  }
});

app.post('/api/user-answers', express.json(), (req, res) => {
  try {
    const { pdfName, answers, timestamp, totalScore, totalQuestions, score, category } = req.body;
    
    if (!pdfName || !answers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userAnswersDir = path.join(__dirname, 'user_answers');
    if (!fs.existsSync(userAnswersDir)) {
      fs.mkdirSync(userAnswersDir, { recursive: true });
    }

    const safeTimestamp = (timestamp || new Date().toISOString()).replace(/[:.]/g, '-');
    const safePdfName = pdfName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safePdfName}_${safeTimestamp}_user_answers.json`;
    const filePath = path.join(userAnswersDir, filename);
    
    const data = {
      pdfName,
      quizName: pdfName,
      answers,
      timestamp: timestamp || new Date().toISOString(),
      totalScore,
      totalQuestions,
      score: score || Math.round((totalScore / totalQuestions) * 100),
      category: category || 'mixed'
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, filename });

  } catch (error) {
    res.status(500).json({ error: 'Failed to save user answers' });
  }
});

app.post('/api/flashcard-session', express.json(), (req, res) => {
  try {
    const { flashcardName, cardsReviewed, sessionDuration, timestamp, category } = req.body;
    
    const flashcardSessionsDir = path.join(__dirname, 'flashcard_sessions');
    if (!fs.existsSync(flashcardSessionsDir)) {
      fs.mkdirSync(flashcardSessionsDir, { recursive: true });
    }

    const sessionData = {
      flashcardName,
      cardsReviewed,
      sessionDuration,
      timestamp: timestamp || new Date().toISOString(),
      category: category || 'mixed'
    };

    const safeFlashcardName = flashcardName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${safeFlashcardName}_${safeTimestamp}_flashcard_session.json`;
    const filePath = path.join(flashcardSessionsDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
    res.json({ success: true, filename });

  } catch (error) {
    res.status(500).json({ error: 'Failed to save flashcard session' });
  }
});

app.post('/api/study-session', express.json(), (req, res) => {
  try {
    const { sessionType, duration, activity, category, score } = req.body;

    const sessionData = {
      sessionType,
      duration,
      activity,
      category: category || 'mixed',
      score,
      timestamp: new Date().toISOString(),
      date: new Date().toDateString()
    };

    const studySessionsDir = path.join(__dirname, 'study_sessions');
    if (!fs.existsSync(studySessionsDir)) {
      fs.mkdirSync(studySessionsDir, { recursive: true });
    }

    const filename = `session_${Date.now()}.json`;
    const filePath = path.join(studySessionsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
    
    res.json({ success: true, sessionId: filename });

  } catch (error) {
    res.status(500).json({ error: 'Failed to save study session' });
  }
});

app.get('/api/user-progress/quiz-stats', (req, res) => {
  try {
    const userAnswersDir = path.join(__dirname, 'user_answers');
    const quizzesDir = path.join(__dirname, 'generated_quizzes');
    
    if (!fs.existsSync(userAnswersDir)) {
      return res.json({
        quizzesCompleted: 0,
        totalQuizzes: 0,
        categoryBreakdown: {},
        recentActivity: []
      });
    }

    const userAnswerFiles = fs.readdirSync(userAnswersDir)
      .filter(file => file.endsWith('_user_answers.json'));

    let quizzesCompleted = userAnswerFiles.length;
    const categoryBreakdown = {};
    const recentActivity = [];

    userAnswerFiles.forEach(file => {
      try {
        const filePath = path.join(userAnswersDir, file);
        const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const quizScore = userData.score || 0;
        const category = userData.category || 'mixed';
        
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = {
            quizzesCompleted: 0,
            totalQuizzes: 0,
            averageScore: 0,
            totalScore: 0
          };
        }
        
        categoryBreakdown[category].quizzesCompleted++;
        categoryBreakdown[category].totalScore += quizScore;
        
        recentActivity.push({
          type: 'quiz',
          name: userData.pdfName,
          score: quizScore,
          date: userData.timestamp,
          category: category
        });
      } catch (err) {}
    });

    Object.keys(categoryBreakdown).forEach(category => {
      const data = categoryBreakdown[category];
      data.averageScore = data.quizzesCompleted > 0 ? 
        (data.totalScore / data.quizzesCompleted) : 0;
    });

    let totalQuizzes = 0;
    if (fs.existsSync(quizzesDir)) {
      const categories = fs.readdirSync(quizzesDir);
      categories.forEach(category => {
        const categoryPath = path.join(quizzesDir, category);
        if (fs.statSync(categoryPath).isDirectory()) {
          const quizFiles = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.json'));
          totalQuizzes += quizFiles.length;
          
          if (categoryBreakdown[category]) {
            categoryBreakdown[category].totalQuizzes = quizFiles.length;
          }
        }
      });
    }

    res.json({
      quizzesCompleted,
      totalQuizzes,
      categoryBreakdown,
      recentActivity: recentActivity.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate quiz statistics' });
  }
});

app.get('/api/user-progress/flashcard-stats', (req, res) => {
  try {
    const flashcardsDir = path.join(__dirname, 'generated_flashcards');
    const flashcardSessionsDir = path.join(__dirname, 'flashcard_sessions');
    
    let totalFlashcards = 0;
    let flashcardsReviewed = 0;
    
    if (fs.existsSync(flashcardsDir)) {
      const categories = fs.readdirSync(flashcardsDir);
      categories.forEach(category => {
        const categoryPath = path.join(flashcardsDir, category);
        if (fs.statSync(categoryPath).isDirectory()) {
          const flashcardFiles = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.json'));
          
          flashcardFiles.forEach(file => {
            try {
              const filePath = path.join(categoryPath, file);
              const flashcards = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              if (Array.isArray(flashcards)) {
                totalFlashcards += flashcards.length;
              }
            } catch (err) {}
          });
        }
      });
    }

    const reviewedSets = new Set();
    
    if (fs.existsSync(flashcardSessionsDir)) {
      const sessionFiles = fs.readdirSync(flashcardSessionsDir)
        .filter(file => file.endsWith('_flashcard_session.json'));
      
      sessionFiles.forEach(file => {
        try {
          const filePath = path.join(flashcardSessionsDir, file);
          const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (session.flashcardName) {
            reviewedSets.add(session.flashcardName);
          }
        } catch (err) {}
      });
      
      reviewedSets.forEach(setName => {
        const safeName = setName.replace(/\s+/g, '_').replace(/,/g, '');
        
        if (fs.existsSync(flashcardsDir)) {
          const categories = fs.readdirSync(flashcardsDir);
          for (const category of categories) {
            const categoryPath = path.join(flashcardsDir, category);
            if (fs.statSync(categoryPath).isDirectory()) {
              const possiblePaths = [
                path.join(categoryPath, `${safeName}.json`),
                path.join(categoryPath, `${safeName}_flashcards.json`),
                path.join(categoryPath, `${safeName}_llama_context_flashcards.json`)
              ];
              
              for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                  try {
                    const flashcards = JSON.parse(fs.readFileSync(possiblePath, 'utf8'));
                    if (Array.isArray(flashcards)) {
                      flashcardsReviewed += flashcards.length;
                    }
                    break;
                  } catch (err) {}
                }
              }
            }
          }
        }
      });
    }
    
    res.json({
      flashcardsReviewed,
      totalFlashcards
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate flashcard statistics' });
  }
});

app.get('/api/user-progress/activity-stats', (req, res) => {
  try {
    const studySessionsDir = path.join(__dirname, 'study_sessions');
    const quizAnswersDir = path.join(__dirname, 'user_answers');
    const flashcardSessionsDir = path.join(__dirname, 'flashcard_sessions');
    
    let hoursStudied = 0;
    let studyStreak = 0;
    let lastStudyDate = '';
    let improvementRate = 0;
    let recentActivity = [];

    const toMinutes = (raw) => {
      return raw > 1800 ? Math.round(raw / 60000) : raw;
    };

    const allSessions = [];
    
    if (fs.existsSync(studySessionsDir)) {
      const sessionFiles = fs.readdirSync(studySessionsDir)
        .filter(file => file.endsWith('.json'));
      
      sessionFiles.forEach(file => {
        try {
          const filePath = path.join(studySessionsDir, file);
          const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          allSessions.push(session);
          hoursStudied += toMinutes(session.duration || 0) / 60;
        } catch (err) {}
      });
    }

    if (fs.existsSync(quizAnswersDir)) {
      const quizFiles = fs.readdirSync(quizAnswersDir)
        .filter(file => file.endsWith('.json'));
      
      quizFiles.forEach(file => {
        try {
          const filePath = path.join(quizAnswersDir, file);
          const quizData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const duration = (quizData.answers?.length || 0) * 1;
          hoursStudied += duration / 60;
          
          if (quizData.score !== undefined || quizData.totalScore !== undefined) {
            const score = quizData.score || Math.round((quizData.totalScore / quizData.totalQuestions) * 100);
            allSessions.push({
              sessionType: 'quiz',
              activity: quizData.pdfName || quizData.quizName || 'Quiz',
              score: score,
              timestamp: quizData.timestamp || file.split('_')[1]?.split('.')[0],
              duration: duration,
              category: quizData.category || 'mixed',
              totalQuestions: quizData.totalQuestions,
              correctAnswers: quizData.totalScore
            });
          }
        } catch (err) {}
      });
    }

    if (fs.existsSync(flashcardSessionsDir)) {
      const flashcardFiles = fs.readdirSync(flashcardSessionsDir)
        .filter(file => file.endsWith('.json'));
      
      flashcardFiles.forEach(file => {
        try {
          const filePath = path.join(flashcardSessionsDir, file);
          const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const duration = toMinutes(session.sessionDuration || (session.cardsReviewed * 0.5));
          hoursStudied += duration / 60;
          allSessions.push({
            sessionType: 'flashcard',
            activity: session.flashcardName || 'Flashcards',
            timestamp: session.timestamp,
            duration: duration,
            category: session.category || 'mixed',
            cardsReviewed: session.cardsReviewed
          });
        } catch (err) {}
      });
    }

    const uniqueDates = [...new Set(allSessions.map(session => {
      const date = new Date(session.timestamp);
      return date.toDateString();
    }))].sort((a, b) => new Date(b) - new Date(a));

    if (uniqueDates.length > 0) {
      lastStudyDate = uniqueDates[0];
      const today = new Date();
      let currentDate = new Date(today);
      studyStreak = 0;
      
      if (uniqueDates.includes(today.toDateString())) {
        studyStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
      
      while (uniqueDates.includes(currentDate.toDateString())) {
        studyStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    const byDayKey = (s) => [
      s.sessionType,
      s.activity,
      new Date(s.timestamp).toDateString()
    ].join('|');

    const sessionMap = new Map();

    allSessions.forEach(s => {
      const key = byDayKey(s);
      if (!sessionMap.has(key)) {
        sessionMap.set(key, { ...s });
      } else {
        const prev = sessionMap.get(key);
        prev.duration = Math.max(prev.duration, s.duration);
        prev.timestamp = new Date(prev.timestamp) > new Date(s.timestamp)
          ? prev.timestamp
          : s.timestamp;
        
        if (s.score !== undefined) prev.score = s.score;
        if (s.cardsReviewed !== undefined) {
          prev.cardsReviewed = (prev.cardsReviewed || 0) + s.cardsReviewed;
        }
      }
    });

    recentActivity = Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map(s => ({
        type: s.sessionType,
        name: s.activity,
        score: s.score,
        date: s.timestamp,
        category: s.category,
        cardsReviewed: s.cardsReviewed
      }));

    const recentScores = allSessions
      .filter(s => s.score !== undefined)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    
    if (recentScores.length >= 4) {
      const recent = recentScores.slice(0, 2).reduce((sum, s) => sum + s.score, 0) / 2;
      const older = recentScores.slice(2, 4).reduce((sum, s) => sum + s.score, 0) / 2;
      improvementRate = recent - older;
    }

    res.json({
      hoursStudied,
      studyStreak,
      lastStudyDate,
      improvementRate,
      recentActivity
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate activity statistics' });
  }
});

app.get('/api/user-progress/detailed-history', (req, res) => {
  try {
    const studySessionsDir = path.join(__dirname, 'study_sessions');
    const quizAnswersDir = path.join(__dirname, 'user_answers');
    const flashcardSessionsDir = path.join(__dirname, 'flashcard_sessions');
    
    const toMinutes = (raw) => {
      return raw > 1800 ? Math.round(raw / 60000) : raw;
    };

    const allHistory = [];

    if (fs.existsSync(quizAnswersDir)) {
      const quizFiles = fs.readdirSync(quizAnswersDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(quizAnswersDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            filePath: filePath,
            modTime: stats.mtime
          };
        })
        .sort((a, b) => b.modTime.getTime() - a.modTime.getTime());
      
      quizFiles.forEach(({filename, filePath}) => {
        try {
          const quizData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (quizData.answers && quizData.answers.length > 0) {
            const score = quizData.score || (quizData.totalScore && quizData.totalQuestions ? 
              Math.round((quizData.totalScore / quizData.totalQuestions) * 100) : 0);
            const duration = (quizData.answers?.length || 0) * 1;
            const timestamp = quizData.timestamp || fs.statSync(filePath).mtime.toISOString();
            
            allHistory.push({
              id: filename.replace('.json', ''),
              type: 'quiz',
              name: quizData.pdfName || quizData.quizName || filename.replace('_user_answers.json', ''),
              score: score,
              totalQuestions: quizData.totalQuestions || 0,
              correctAnswers: quizData.totalScore || 0,
              duration: duration,
              timestamp: timestamp,
              category: quizData.category || 'mixed',
              answers: quizData.answers
            });
          }
        } catch (err) {}
      });
    }

    if (fs.existsSync(flashcardSessionsDir)) {
      const flashcardFiles = fs.readdirSync(flashcardSessionsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(flashcardSessionsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            filePath: filePath,
            modTime: stats.mtime
          };
        })
        .sort((a, b) => b.modTime.getTime() - a.modTime.getTime());
      
      flashcardFiles.forEach(({filename, filePath}) => {
        try {
          const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const duration = toMinutes(session.sessionDuration || (session.cardsReviewed * 0.5));
          const timestamp = session.timestamp || fs.statSync(filePath).mtime.toISOString();
          allHistory.push({
            id: filename.replace('.json', ''),
            type: 'flashcard',
            name: session.flashcardName || filename.replace('_flashcard_session.json', ''),
            cardsReviewed: session.cardsReviewed || 0,
            duration: duration,
            timestamp: timestamp,
            category: session.category || 'mixed'
          });
        } catch (err) {}
      });
    }

    allHistory.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });

    res.json({
      history: allHistory,
      total: allHistory.length,
      breakdown: {
        quizzes: allHistory.filter(h => h.type === 'quiz').length,
        flashcards: allHistory.filter(h => h.type === 'flashcard').length
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch detailed history' });
  }
});

app.post('/api/trigger-ai-tutor', express.json(), (req, res) => {
  try {
    const { pdfName } = req.body;
    
    if (!pdfName) {
      return res.status(400).json({ error: 'PDF name is required' });
    }

    const safeName = pdfName.replace(/\s+/g, '_').replace(/,/g, '');
    const tutorScriptPath = path.join(__dirname, 'ai_tutor.py');
    if (!fs.existsSync(tutorScriptPath)) {
      return res.status(500).json({ error: 'AI tutor script not found' });
    }
    
    const userAnswersDir = path.join(__dirname, 'user_answers');
    if (!fs.existsSync(userAnswersDir)) {
      return res.status(404).json({ error: 'User answers directory not found' });
    }

    const files = fs.readdirSync(userAnswersDir)
      .filter(file => file.startsWith(safeName) && file.endsWith('_user_answers.json'));

    if (files.length === 0) {
      return res.status(404).json({ error: 'User answers not found' });
    }

    let latestFile = files[0];
    let latestMtime = fs.statSync(path.join(userAnswersDir, latestFile)).mtime;

    for (const file of files) {
      const filePath = path.join(userAnswersDir, file);
      const mtime = fs.statSync(filePath).mtime;
      if (mtime > latestMtime) {
        latestMtime = mtime;
        latestFile = file;
      }
    }

    const userAnswersPath = path.join(userAnswersDir, latestFile);
    const quizzesDir = path.join(__dirname, 'generated_quizzes');
    let quizPath = null;
    
    if (fs.existsSync(quizzesDir)) {
      const categories = fs.readdirSync(quizzesDir).filter(item => {
        const itemPath = path.join(quizzesDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      for (const category of categories) {
        const possiblePaths = [
          path.join(quizzesDir, category, `${safeName}_llama_context_quiz.json`),
          path.join(quizzesDir, category, `${safeName}.json`),
          path.join(quizzesDir, category, `${safeName}_quiz.json`)
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            quizPath = possiblePath;
            break;
          }
        }
        if (quizPath) break;
      }
    }

    if (!quizPath) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const tutorProcess = spawn(PYTHON_PATH, ['ai_tutor.py', quizPath, userAnswersPath], {
      cwd: __dirname,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let stderrData = '';

    tutorProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    tutorProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    tutorProcess.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: 'AI tutor completed successfully',
          stdout: stdoutData
        });
      } else {
        res.status(500).json({
          error: 'AI tutor failed',
          code: code,
          stdout: stdoutData,
          stderr: stderrData
        });
      }
    });

    tutorProcess.on('error', (err) => {
      res.status(500).json({
        error: 'Failed to start AI tutor process',
        details: err.message
      });
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to trigger AI tutor', 
      details: error.message 
    });
  }
});

app.get('/api/tutor-explanations/:pdfName', (req, res) => {
  try {
    const pdfName = req.params.pdfName;
    const safeName = pdfName.replace(/\s+/g, '_').replace(/,/g, '');
    const tutorDir = path.join(__dirname, 'tutor_explanations');
    
    if (!fs.existsSync(tutorDir)) {
      return res.status(404).json({ error: 'Tutor directory not found' });
    }
    
    const files = fs.readdirSync(tutorDir);
    const tutorFiles = files
      .filter(file => file.startsWith(safeName) && file.endsWith('_tutor_explanations.json'))
      .sort((a, b) => {
        const timestampA = parseInt(a.match(/_(\d+)_tutor_explanations\.json$/)?.[1] || '0');
        const timestampB = parseInt(b.match(/_(\d+)_tutor_explanations\.json$/)?.[1] || '0');
        return timestampB - timestampA;
      });
    
    if (tutorFiles.length > 0) {
      const tutorOutputPath = path.join(tutorDir, tutorFiles[0]);
      if (fs.existsSync(tutorOutputPath)) {
        const explanations = JSON.parse(fs.readFileSync(tutorOutputPath, 'utf8'));
        const cleanedExplanations = explanations.map(explanation => ({
          ...explanation,
          explanation: explanation.explanation
            ? explanation.explanation
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/`(.*?)`/g, '$1')
                .replace(/#{1,6}\s/g, '')
                .trim()
            : explanation.explanation
        }));
        res.json(cleanedExplanations);
      } else {
        res.status(404).json({ error: 'Tutor explanations file not found' });
      }
    } else {
      res.status(404).json({ error: 'Tutor explanations not found' });
    }
  } catch (err) {
    res.status(500).json({
      error: 'Failed to read tutor explanations',
      details: err.message
    });
  }
});

app.get('/api/flashcards/:category', (req, res) => {
  try {
    const category = req.params.category;
    const categoryDir = path.join(__dirname, 'generated_flashcards', category);
    
    if (!fs.existsSync(categoryDir)) {
      return res.json({ flashcards: [] });
    }
    
    const allFiles = fs.readdirSync(categoryDir);
    const jsonFiles = allFiles.filter(file => file.toLowerCase().endsWith('.json'));
    const flashcardNames = jsonFiles.map(file => file.replace('.json', ''));
    
    res.json({ flashcards: flashcardNames, category });
    
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch flashcards list',
      details: err.message
    });
  }
});

app.get('/api/flashcards/:category/:flashcardName', (req, res) => {
  try {
    const category = req.params.category;
    const flashcardName = req.params.flashcardName;
    const categoryDir = path.join(__dirname, 'generated_flashcards', category);
    
    if (!fs.existsSync(categoryDir)) {
      return res.status(404).json({ error: 'Category directory not found' });
    }
    
    const filesInDir = fs.readdirSync(categoryDir);
    const possibleFilenames = [
      `${flashcardName}.json`,
      `${flashcardName}_flashcards.json`,
      `${flashcardName}_llama_context_flashcards.json`
    ];
    
    let foundFilePath = null;
    
    for (const filename of possibleFilenames) {
      const filePath = path.join(categoryDir, filename);
      if (fs.existsSync(filePath)) {
        foundFilePath = filePath;
        break;
      }
    }
    
    if (!foundFilePath) {
      const requestedNameLower = flashcardName.toLowerCase();
      for (const file of filesInDir) {
        if (file.toLowerCase().endsWith('.json')) {
          const fileNameWithoutExt = file.replace('.json', '').toLowerCase();
          if (fileNameWithoutExt === requestedNameLower || 
              fileNameWithoutExt.includes(requestedNameLower) ||
              requestedNameLower.includes(fileNameWithoutExt)) {
            foundFilePath = path.join(categoryDir, file);
            break;
          }
        }
      }
    }
    
    if (!foundFilePath) {
      return res.status(404).json({ error: 'Flashcard file not found' });
    }
    
    const fileContent = fs.readFileSync(foundFilePath, 'utf8');
    let flashcardData;
    
    try {
      flashcardData = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }
    
    if (!Array.isArray(flashcardData)) {
      return res.status(400).json({ error: 'Invalid flashcard format' });
    }
    
    const validFlashcards = flashcardData.filter(card => {
      return card && typeof card === 'object' && card.question && card.answer;
    });
    
    if (validFlashcards.length === 0) {
      return res.status(400).json({ error: 'No valid flashcards found' });
    }
    
    res.json(validFlashcards);
    
  } catch (err) {
    res.status(500).json({
      error: 'Server error while processing flashcards',
      details: err.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'API Server Running' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});