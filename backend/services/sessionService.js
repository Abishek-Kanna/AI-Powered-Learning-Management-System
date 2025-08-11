const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

// Define directories
const userAnswersDir = path.join(__dirname, '../user_answers');
const flashcardSessionsDir = path.join(__dirname, '../flashcard_sessions');
const studySessionsDir = path.join(__dirname, '../study_sessions');
const quizzesDir = path.join(__dirname, '../generated_quizzes');
const flashcardsDir = path.join(__dirname, '../generated_flashcards');
const tutorDir = path.join(__dirname, '../tutor_explanations');

// Ensure directories exist
[userAnswersDir, flashcardSessionsDir, studySessionsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper function to safely read JSON files
const safeReadJSON = async (filePath) => {
  try {
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return null;
  }
};

// Helper function to convert duration to minutes
const toMinutes = (raw) => {
  return raw > 1800 ? Math.round(raw / 60000) : raw;
};

// Save user quiz answers
exports.saveUserAnswers = (data) => {
  const { pdfName, answers, timestamp, totalScore, totalQuestions, score, category } = data;
  
  if (!pdfName || !answers) {
    throw new Error('Missing required fields: pdfName and answers are required');
  }

  const safeTimestamp = (timestamp || new Date().toISOString()).replace(/[:.]/g, '-');
  const safePdfName = pdfName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safePdfName}_${safeTimestamp}_user_answers.json`;
  const filePath = path.join(userAnswersDir, filename);
  
  const payload = {
  pdfName,
  quizName: pdfName,
  answers: Array.isArray(answers) ? answers : [],
  timestamp: timestamp || new Date().toISOString(),
  totalScore: typeof totalScore === 'number' ? totalScore : (Array.isArray(answers) ? answers.filter(a => a?.correct).length : 0),
  totalQuestions: typeof totalQuestions === 'number' ? totalQuestions : (Array.isArray(answers) ? answers.length : 0),
  score: typeof score === 'number' ? score : (
    Array.isArray(answers) && answers.length > 0 ?
      Math.round((answers.filter(a => a?.correct).length / answers.length) * 100) :
      0
  ),
  category: typeof category === 'string' ? category : 'mixed'
};

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return { success: true, filename, filePath };
};

// Save flashcard session
exports.saveFlashcardSession = (data) => {
  const { flashcardName, cardsReviewed, sessionDuration, timestamp, category } = data;
  
  if (!flashcardName) {
    throw new Error('Flashcard name is required');
  }

  const payload = {
    flashcardName,
    cardsReviewed: cardsReviewed || 0,
    sessionDuration: sessionDuration || 0,
    timestamp: timestamp || new Date().toISOString(),
    category: category || 'mixed'
  };

  const safeFlashcardName = flashcardName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${safeFlashcardName}_${safeTimestamp}_flashcard_session.json`;
  const filePath = path.join(flashcardSessionsDir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return { success: true, filename, filePath };
};

// Save study session
exports.saveStudySession = (data) => {
  const { sessionType, duration, activity, category, score } = data;

  if (!sessionType || !duration) {
    throw new Error('Session type and duration are required');
  }

  const payload = {
    sessionType,
    duration,
    activity,
    category: category || 'mixed',
    score,
    timestamp: new Date().toISOString(),
    date: new Date().toDateString()
  };

  const filename = `session_${Date.now()}.json`;
  const filePath = path.join(studySessionsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  
  return { success: true, sessionId: filename, filePath };
};

// Get user quiz statistics
exports.getUserQuizStats = async () => {
  try {
    if (!fs.existsSync(userAnswersDir)) {
      return {
        quizzesCompleted: 0,
        totalQuizzes: 0,
        categoryBreakdown: {},
        recentActivity: []
      };
    }

    const files = await readdir(userAnswersDir);
    const userAnswerFiles = files.filter(file => file.endsWith('_user_answers.json'));

    let quizzesCompleted = userAnswerFiles.length;
    const categoryBreakdown = {};
    const recentActivity = [];

    // Process each answer file
    for (const file of userAnswerFiles) {
      try {
        const filePath = path.join(userAnswersDir, file);
        const userData = await safeReadJSON(filePath);
        if (!userData) continue;

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
          name: userData.pdfName || userData.quizName || file.replace('_user_answers.json', ''),
          score: quizScore,
          date: userData.timestamp,
          category: category
        });
      } catch (err) {
        console.error(`Error processing user answer file ${file}:`, err);
      }
    }

    // Calculate averages
    for (const category in categoryBreakdown) {
      const data = categoryBreakdown[category];
      data.averageScore = data.quizzesCompleted > 0 ? 
        Math.round(data.totalScore / data.quizzesCompleted) : 0;
    }

    // Count total quizzes available
    let totalQuizzes = 0;
    if (fs.existsSync(quizzesDir)) {
      const categories = await readdir(quizzesDir);
      for (const category of categories) {
        const categoryPath = path.join(quizzesDir, category);
        const stats = await stat(categoryPath);
        if (!stats.isDirectory()) continue;
        
        const quizFiles = (await readdir(categoryPath))
          .filter(file => file.endsWith('.json'));
        
        totalQuizzes += quizFiles.length;
        
        if (categoryBreakdown[category]) {
          categoryBreakdown[category].totalQuizzes = quizFiles.length;
        }
      }
    }

    // Sort recent activity by date
    recentActivity.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      quizzesCompleted,
      totalQuizzes,
      categoryBreakdown,
      recentActivity: recentActivity.slice(0, 10) // Return top 10
    };

  } catch (err) {
    console.error('Error in getUserQuizStats:', err);
    throw new Error('Failed to calculate quiz statistics');
  }
};

// Get flashcard statistics
exports.getUserFlashcardStats = async () => {
  try {
    let totalFlashcards = 0;
    let flashcardsReviewed = 0;
    
    // Count all flashcards
    if (fs.existsSync(flashcardsDir)) {
      const categories = await readdir(flashcardsDir);
      for (const category of categories) {
        const categoryPath = path.join(flashcardsDir, category);
        const stats = await stat(categoryPath);
        if (!stats.isDirectory()) continue;
        
        const flashcardFiles = await readdir(categoryPath);
        for (const file of flashcardFiles.filter(f => f.endsWith('.json'))) {
          try {
            const filePath = path.join(categoryPath, file);
            const flashcards = await safeReadJSON(filePath);
            if (Array.isArray(flashcards)) {
              totalFlashcards += flashcards.length;
            }
          } catch (err) {
            console.error(`Error processing flashcard file ${file}:`, err);
          }
        }
      }
    }

    // Count reviewed flashcards
    const reviewedSets = new Set();
    
    if (fs.existsSync(flashcardSessionsDir)) {
      const sessionFiles = await readdir(flashcardSessionsDir);
      const flashcardSessions = sessionFiles.filter(file => file.endsWith('_flashcard_session.json'));
      
      for (const file of flashcardSessions) {
        try {
          const filePath = path.join(flashcardSessionsDir, file);
          const session = await safeReadJSON(filePath);
          if (session && session.flashcardName) {
            reviewedSets.add(session.flashcardName);
          }
        } catch (err) {
          console.error(`Error processing flashcard session ${file}:`, err);
        }
      }
    }

    // Count flashcards in reviewed sets
    for (const setName of reviewedSets) {
      const safeName = setName.replace(/\s+/g, '_').replace(/,/g, '');
      
      if (fs.existsSync(flashcardsDir)) {
        const categories = await readdir(flashcardsDir);
        for (const category of categories) {
          const categoryPath = path.join(flashcardsDir, category);
          const stats = await stat(categoryPath);
          if (!stats.isDirectory()) continue;
          
          const possiblePaths = [
            path.join(categoryPath, `${safeName}.json`),
            path.join(categoryPath, `${safeName}_flashcards.json`),
            path.join(categoryPath, `${safeName}_llama_context_flashcards.json`)
          ];
          
          for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
              try {
                const flashcards = await safeReadJSON(possiblePath);
                if (Array.isArray(flashcards)) {
                  flashcardsReviewed += flashcards.length;
                }
                break;
              } catch (err) {
                console.error(`Error reading flashcard file ${possiblePath}:`, err);
              }
            }
          }
        }
      }
    }
    
    return {
      flashcardsReviewed,
      totalFlashcards,
      setsReviewed: reviewedSets.size
    };

  } catch (err) {
    console.error('Error in getUserFlashcardStats:', err);
    throw new Error('Failed to calculate flashcard statistics');
  }
};

// Get activity statistics
exports.getUserActivityStats = async () => {
  try {
    let hoursStudied = 0;
    let studyStreak = 0;
    let lastStudyDate = '';
    let improvementRate = 0;
    const allSessions = [];

    // Process study sessions
    if (fs.existsSync(studySessionsDir)) {
      const sessionFiles = await readdir(studySessionsDir);
      for (const file of sessionFiles.filter(f => f.endsWith('.json'))) {
        try {
          const filePath = path.join(studySessionsDir, file);
          const session = await safeReadJSON(filePath);
          if (session) {
            allSessions.push(session);
            hoursStudied += toMinutes(session.duration || 0) / 60;
          }
        } catch (err) {
          console.error(`Error processing study session ${file}:`, err);
        }
      }
    }

    // Process quiz sessions
    if (fs.existsSync(userAnswersDir)) {
      const quizFiles = await readdir(userAnswersDir);
      for (const file of quizFiles.filter(f => f.endsWith('.json'))) {
        try {
          const filePath = path.join(userAnswersDir, file);
          const quizData = await safeReadJSON(filePath);
          if (quizData) {
            const duration = (quizData.answers?.length || 0) * 1; // 1 min per question
            hoursStudied += duration / 60;
            
            if (quizData.score !== undefined || quizData.totalScore !== undefined) {
              const score = quizData.score || 
                (quizData.totalScore && quizData.totalQuestions ? 
                  Math.round((quizData.totalScore / quizData.totalQuestions) * 100) : 0);
              
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
          }
        } catch (err) {
          console.error(`Error processing quiz answer ${file}:`, err);
        }
      }
    }

    // Process flashcard sessions
    if (fs.existsSync(flashcardSessionsDir)) {
      const flashcardFiles = await readdir(flashcardSessionsDir);
      for (const file of flashcardFiles.filter(f => f.endsWith('.json'))) {
        try {
          const filePath = path.join(flashcardSessionsDir, file);
          const session = await safeReadJSON(filePath);
          if (session) {
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
          }
        } catch (err) {
          console.error(`Error processing flashcard session ${file}:`, err);
        }
      }
    }

    // Calculate study streak
    const uniqueDates = [...new Set(allSessions.map(session => {
      const date = new Date(session.timestamp);
      return date.toDateString();
    }))].sort((a, b) => new Date(b) - new Date(a));

    if (uniqueDates.length > 0) {
      lastStudyDate = uniqueDates[0];
      const today = new Date();
      let currentDate = new Date(today);
      studyStreak = 0;
      
      // Check if studied today
      if (uniqueDates.includes(today.toDateString())) {
        studyStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
      
      // Check consecutive days
      while (uniqueDates.includes(currentDate.toDateString())) {
        studyStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    // Deduplicate sessions by day and activity type
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

    // Prepare recent activity
    const recentActivity = Array.from(sessionMap.values())
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

    // Calculate improvement rate
    const recentScores = allSessions
      .filter(s => s.score !== undefined)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    
    if (recentScores.length >= 4) {
      const recentAvg = recentScores.slice(0, 2).reduce((sum, s) => sum + s.score, 0) / 2;
      const olderAvg = recentScores.slice(2, 4).reduce((sum, s) => sum + s.score, 0) / 2;
      improvementRate = Math.round((recentAvg - olderAvg) * 10) / 10; // 1 decimal place
    }

    return {
      hoursStudied: Math.round(hoursStudied * 10) / 10, // 1 decimal place
      studyStreak,
      lastStudyDate,
      improvementRate,
      recentActivity
    };

  } catch (err) {
    console.error('Error in getUserActivityStats:', err);
    throw new Error('Failed to calculate activity statistics');
  }
};

// Get detailed history
exports.getUserDetailedHistory = async () => {
  try {
    const allHistory = [];

    // Process quiz history
    if (fs.existsSync(userAnswersDir)) {
      const quizFiles = await readdir(userAnswersDir);
      const quizAnswerFiles = quizFiles
        .filter(file => file.endsWith('.json'))
        .map(file => ({ filename: file, filePath: path.join(userAnswersDir, file) }))
        .sort((a, b) => b.filename.localeCompare(a.filename)); // Newest first
      
      for (const { filename, filePath } of quizAnswerFiles) {
        try {
          const quizData = await safeReadJSON(filePath);
          if (quizData && quizData.answers && quizData.answers.length > 0) {
            const score = quizData.score || 
              (quizData.totalScore && quizData.totalQuestions ? 
                Math.round((quizData.totalScore / quizData.totalQuestions) * 100) : 0);
            
            const duration = (quizData.answers?.length || 0) * 1; // 1 min per question
            const timestamp = quizData.timestamp || (await stat(filePath)).mtime.toISOString();
            
            allHistory.push({
              id: filename.replace('.json', ''),
              type: 'quiz',
              name: quizData.pdfName || quizData.quizName || filename.replace('_user_answers.json', ''),
              score: score,
              totalQuestions: quizData.totalQuestions || quizData.answers.length,
              correctAnswers: quizData.totalScore || quizData.answers.filter(a => a.correct).length,
              duration: duration,
              timestamp: timestamp,
              category: quizData.category || 'mixed',
              answers: quizData.answers
            });
          }
        } catch (err) {
          console.error(`Error processing quiz history ${filename}:`, err);
        }
      }
    }

    // Process flashcard history
    if (fs.existsSync(flashcardSessionsDir)) {
      const flashcardFiles = await readdir(flashcardSessionsDir);
      const flashcardSessionFiles = flashcardFiles
        .filter(file => file.endsWith('.json'))
        .map(file => ({ filename: file, filePath: path.join(flashcardSessionsDir, file) }))
        .sort((a, b) => b.filename.localeCompare(a.filename)); // Newest first
      
      for (const { filename, filePath } of flashcardSessionFiles) {
        try {
          const session = await safeReadJSON(filePath);
          if (session) {
            const duration = toMinutes(session.sessionDuration || (session.cardsReviewed * 0.5));
            const timestamp = session.timestamp || (await stat(filePath)).mtime.toISOString();
            allHistory.push({
              id: filename.replace('.json', ''),
              type: 'flashcard',
              name: session.flashcardName || filename.replace('_flashcard_session.json', ''),
              cardsReviewed: session.cardsReviewed || 0,
              duration: duration,
              timestamp: timestamp,
              category: session.category || 'mixed'
            });
          }
        } catch (err) {
          console.error(`Error processing flashcard history ${filename}:`, err);
        }
      }
    }

    // Process tutor sessions (if needed)
    if (fs.existsSync(tutorDir)) {
      const tutorFiles = await readdir(tutorDir);
      const tutorSessionFiles = tutorFiles
        .filter(file => file.endsWith('_tutor_explanations.json'))
        .map(file => ({ filename: file, filePath: path.join(tutorDir, file) }))
        .sort((a, b) => b.filename.localeCompare(a.filename)); // Newest first
      
      for (const { filename, filePath } of tutorSessionFiles) {
        try {
          const tutorData = await safeReadJSON(filePath);
          if (Array.isArray(tutorData) && tutorData.length > 0) {
            const pdfNameMatch = filename.match(/(.+?)_\d+_tutor_explanations\.json/);
            const pdfName = pdfNameMatch ? pdfNameMatch[1] : filename.replace('_tutor_explanations.json', '');
            const timestamp = (await stat(filePath)).mtime.toISOString();
            
            allHistory.push({
              id: filename.replace('.json', ''),
              type: 'tutor',
              name: `Tutor Session: ${pdfName}`,
              questionsReviewed: tutorData.length,
              timestamp: timestamp,
              category: 'mixed'
            });
          }
        } catch (err) {
          console.error(`Error processing tutor history ${filename}:`, err);
        }
      }
    }

    // Sort all history by timestamp
    allHistory.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      history: allHistory,
      total: allHistory.length,
      breakdown: {
        quizzes: allHistory.filter(h => h.type === 'quiz').length,
        flashcards: allHistory.filter(h => h.type === 'flashcard').length,
        tutor: allHistory.filter(h => h.type === 'tutor').length
      }
    };

  } catch (err) {
    console.error('Error in getUserDetailedHistory:', err);
    throw new Error('Failed to fetch detailed history');
  }
};