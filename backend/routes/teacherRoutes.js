const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have this middleware

// --- Mongoose Models ---
// Make sure you have these models defined in your project.
// The names might be slightly different in your codebase.
const User = require('../models/User'); 
const UserAnswer = require('../models/UserAnswer'); // For quiz results
const FlashcardSession = require('../models/FlashcardSession'); // For flashcard sessions

// @route   GET /api/teacher/all-student-analytics
// @desc    Get detailed analytics for all students
// @access  Private (Teacher)
router.get('/all-student-analytics', authMiddleware, async (req, res) => {
  try {
    // 1. Fetch all users who have the 'student' role
    const students = await User.find({ role: 'student' }).select('id username');

    if (!students || students.length === 0) {
      return res.status(404).json({ msg: 'No students found' });
    }

    // 2. Aggregate analytics for each student in parallel
    const analyticsData = await Promise.all(
      students.map(async (student) => {
        // --- Quiz Analytics ---
        const quizResults = await UserAnswer.find({ userId: student.id }).sort({ timestamp: -1 });
        const totalQuizzes = quizResults.length;
        const totalQuizScore = quizResults.reduce((sum, r) => sum + r.score, 0);
        const averageScore = totalQuizzes > 0 ? totalQuizScore / totalQuizzes : 0;
        
        // Calculate average score for each category
        const scoreByCategory = quizResults.reduce((acc, result) => {
          const category = result.category || 'mixed';
          if (!acc[category]) {
            acc[category] = { totalScore: 0, count: 0 };
          }
          acc[category].totalScore += result.score;
          acc[category].count += 1;
          return acc;
        }, {});

        const finalScoresByCategory = Object.keys(scoreByCategory).reduce((acc, cat) => {
            acc[cat] = scoreByCategory[cat].totalScore / scoreByCategory[cat].count;
            return acc;
        }, {});


        // --- Flashcard Analytics ---
        const flashcardSessions = await FlashcardSession.find({ userId: student.id }).sort({ timestamp: -1 });
        const totalFlashcardSessions = flashcardSessions.length;
        const totalFlashcardStudyTime = flashcardSessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0); // in seconds

        // --- Combined Analytics ---
        // For simplicity, we'll estimate quiz study time as 5 minutes (300 seconds) per quiz
        // You can make this more accurate if you store quiz duration.
        const estimatedQuizStudyTime = totalQuizzes * 300; 
        const totalStudyTimeInSeconds = totalFlashcardStudyTime + estimatedQuizStudyTime;
        const totalStudyTimeInHours = totalStudyTimeInSeconds / 3600;

        // --- Recent Activities ---
        const recentQuizActivities = quizResults.slice(0, 5).map(r => ({
          type: 'quiz',
          name: r.pdfName,
          score: r.score,
          date: r.timestamp,
        }));

        const recentFlashcardActivities = flashcardSessions.slice(0, 5).map(s => ({
            type: 'flashcard',
            name: s.flashcardName,
            date: s.timestamp,
        }));

        // Combine, sort by date, and get the top 5 most recent activities
        const recentActivities = [...recentQuizActivities, ...recentFlashcardActivities]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);


        // Construct the final analytics object for the student
        return {
          userId: student.id,
          username: student.username,
          totalQuizzes: totalQuizzes,
          totalFlashcards: totalFlashcardSessions, // This is the number of sessions
          averageScore: averageScore,
          studyTime: totalStudyTimeInHours,
          scoreByCategory: finalScoresByCategory,
          recentActivities: recentActivities,
        };
      })
    );

    res.json(analyticsData);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;
