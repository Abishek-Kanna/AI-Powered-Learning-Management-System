const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

const userAnswersBaseDir = path.join(__dirname, '../user_answers');
const flashcardSessionsBaseDir = path.join(__dirname, '../flashcard_sessions');

// Ensure base directories exist
[userAnswersBaseDir, flashcardSessionsBaseDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const safeReadJSON = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = await readFile(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Error reading or parsing JSON from ${filePath}:`, error);
    return null;
  }
};

const getAllUserSessions = async (userId) => {
    const allSessions = [];
    const userQuizDir = path.join(userAnswersBaseDir, userId);
    const userFlashcardDir = path.join(flashcardSessionsBaseDir, userId);

    if (fs.existsSync(userQuizDir)) {
        const quizFiles = await readdir(userQuizDir);
        for (const file of quizFiles) {
            const data = await safeReadJSON(path.join(userQuizDir, file));
            if (data) allSessions.push({ type: 'quiz', ...data });
        }
    }

    if (fs.existsSync(userFlashcardDir)) {
        const flashcardFiles = await readdir(userFlashcardDir);
        for (const file of flashcardFiles) {
            const data = await safeReadJSON(path.join(userFlashcardDir, file));
            if (data) allSessions.push({ type: 'flashcard', ...data });
        }
    }
    
    allSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allSessions;
};


// --- SAVE FUNCTIONS ---

exports.saveUserAnswers = (data) => {
  const { userId, pdfName, timestamp, ...rest } = data;
  if (!userId) throw new Error('A userId is required to save quiz answers.');

  const userDir = path.join(userAnswersBaseDir, userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  const safeTimestamp = (timestamp || new Date().toISOString()).replace(/[:.]/g, '-');
  const safePdfName = pdfName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safePdfName}_${safeTimestamp}_user_answers.json`;
  const filePath = path.join(userDir, filename);
  
  const payload = { userId, pdfName, timestamp: (timestamp || new Date().toISOString()), ...rest };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return { success: true };
};

exports.saveFlashcardSession = (data) => {
    const { userId, flashcardName, timestamp, ...rest } = data;
    if (!userId) throw new Error('A userId is required to save a flashcard session.');

    const userDir = path.join(flashcardSessionsBaseDir, userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    const safeFlashcardName = flashcardName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeTimestamp = (timestamp || new Date().toISOString()).replace(/[:.]/g, '-');
    const filename = `${safeFlashcardName}_${safeTimestamp}_flashcard_session.json`;
    const filePath = path.join(userDir, filename);

    const payload = { userId, flashcardName, timestamp: (timestamp || new Date().toISOString()), ...rest };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    return { success: true };
};

// --- NEW FUNCTION TO ROUTE DATA ---
exports.saveStudySession = (data) => {
  const { sessionType, activity, userId } = data;

  if (!userId) {
    throw new Error('A userId is required to save any session.');
  }

  switch (sessionType) {
    case 'quiz':
      console.log(`✅ Routing to save quiz data for user ${userId}`);
      return exports.saveUserAnswers({ ...data, pdfName: activity });
    
    case 'flashcard':
      console.log(`✅ Routing to save flashcard data for user ${userId}`);
      return exports.saveFlashcardSession({ ...data, flashcardName: activity });

    default:
      console.warn(`⚠️ Unknown session type received: ${sessionType}`);
      return { success: false, message: 'Unknown session type' };
  }
};

// --- GET FUNCTIONS for stats ---

// MODIFIED: Counts unique quizzes completed.
exports.getUserQuizStats = async (userId) => {
    if (!userId) return { quizzesCompleted: 0 };
    const userQuizDir = path.join(userAnswersBaseDir, userId);
    if (!fs.existsSync(userQuizDir)) return { quizzesCompleted: 0 };

    const files = await readdir(userQuizDir);
    const uniqueQuizNames = new Set();
    
    for (const file of files) {
        const session = await safeReadJSON(path.join(userQuizDir, file));
        if (session && session.pdfName) {
            uniqueQuizNames.add(session.pdfName);
        }
    }
    
    return { 
        quizzesCompleted: uniqueQuizNames.size
    };
};

// MODIFIED: Counts unique flashcard decks and total cards reviewed.
exports.getUserFlashcardStats = async (userId) => {
    if (!userId) return { decksReviewed: 0, cardsReviewedTotal: 0 };
    const userFlashcardDir = path.join(flashcardSessionsBaseDir, userId);
    if (!fs.existsSync(userFlashcardDir)) return { decksReviewed: 0, cardsReviewedTotal: 0 };

    const files = await readdir(userFlashcardDir);
    const uniqueDeckNames = new Set();
    let cardsReviewedTotal = 0;

    for (const file of files) {
        const session = await safeReadJSON(path.join(userFlashcardDir, file));
        if (session) {
            if(session.flashcardName) uniqueDeckNames.add(session.flashcardName);
            if (session.cardsReviewed) cardsReviewedTotal += session.cardsReviewed;
        }
    }
    return { 
        decksReviewed: uniqueDeckNames.size, 
        cardsReviewedTotal 
    };
};

// MODIFIED: Slices recent activity to the last 4 sessions.
exports.getUserActivityStats = async (userId) => {
    if (!userId) return { hoursStudied: 0, studyStreak: 0, recentActivity: [] };

    const allSessions = await getAllUserSessions(userId);
    if (allSessions.length === 0) return { hoursStudied: 0, studyStreak: 0, recentActivity: [] };

    let totalDurationMinutes = 0;
    const studyDates = new Set();

    allSessions.forEach(session => {
        if (session.duration) totalDurationMinutes += session.duration;
        studyDates.add(new Date(session.timestamp).toDateString());
    });
    
    const hoursStudied = totalDurationMinutes / 60;
    
    const sortedDates = Array.from(studyDates).map(d => new Date(d)).sort((a,b) => b - a);
    let studyStreak = 0;
    if (sortedDates.length > 0) {
        studyStreak = 1;
        let lastDate = sortedDates[0];
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastDate.toDateString() === today.toDateString() || lastDate.toDateString() === yesterday.toDateString()) {
             for (let i = 1; i < sortedDates.length; i++) {
                const currentDate = sortedDates[i];
                const expectedPreviousDate = new Date(lastDate);
                expectedPreviousDate.setDate(expectedPreviousDate.getDate() - 1);
                if (currentDate.toDateString() === expectedPreviousDate.toDateString()) {
                    studyStreak++;
                    lastDate = currentDate;
                } else {
                    break; 
                }
            }
        } else {
            studyStreak = 0;
        }
    }
    
    const recentActivity = allSessions.slice(0, 4).map(s => ({ // <-- CHANGED to 4
        type: s.type,
        name: s.pdfName || s.flashcardName,
        score: s.score,
        date: s.timestamp,
        category: s.category,
        cardsReviewed: s.cardsReviewed
    }));

    return { 
        hoursStudied, 
        studyStreak, 
        recentActivity 
    };
};

exports.getUserDetailedHistory = async (userId) => {
  if (!userId) throw new Error('A userId is required to get detailed history.');
  const sessions = await getAllUserSessions(userId);
  return {
      history: sessions.map((s, index) => ({
          id: `${s.timestamp}-${index}`,
          type: s.type,
          name: s.pdfName || s.flashcardName,
          score: s.score,
          totalQuestions: s.totalQuestions,
          correctAnswers: s.correctAnswers,
          cardsReviewed: s.cardsReviewed,
          duration: s.duration,
          timestamp: s.timestamp,
          category: s.category
      }))
  };
};