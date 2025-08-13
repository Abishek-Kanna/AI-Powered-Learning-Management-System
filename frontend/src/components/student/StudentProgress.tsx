import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../auth/auth';

// Interfaces for our data structures
interface ProgressStats {
  quizzesCompleted: number;
  totalQuizzes: number;
  flashcardsReviewed: number;
  totalFlashcards: number;
  hoursStudied: number;
  studyStreak: number;
  lastStudyDate: string;
  categoryBreakdown: {
    [category: string]: {
      quizzesCompleted: number;
      totalQuizzes: number;
      averageScore: number;
    };
  };
  recentActivity: Array<{
    type: 'quiz' | 'flashcard';
    name: string;
    score?: number;
    date: string;
    category: string;
    cardsReviewed?: number;
  }>;
}

interface HistoryItem {
  id: string;
  type: 'quiz' | 'flashcard' | 'tutor';
  name: string;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  cardsReviewed?: number;
  duration: number; // in minutes
  timestamp: string;
  category: string;
}

const StudentProgress: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetches the main progress statistics for the dashboard.
  const fetchProgressData = async () => {
    if (!user) return;
    // Set loading to true only for the initial load, not for refreshes.
    if (!stats) setLoading(true);
    setError(null);
    try {
      // --- API PATHS CORRECTED ---
      // Removed hardcoded 'http://localhost:3001' to allow the Vite proxy to work.
      // Fetches quiz, flashcard, and general activity stats in parallel.
      const [quizStatsRes, flashcardStatsRes, activityStatsRes] = await Promise.all([
        fetch(`/api/sessions/quiz-stats/${user.id}`),
        fetch(`/api/sessions/flashcard-stats/${user.id}`),
        fetch(`/api/sessions/activity-stats/${user.id}`)
      ]);

      // Check if all responses are successful.
      if (!quizStatsRes.ok || !flashcardStatsRes.ok || !activityStatsRes.ok) {
        throw new Error('Failed to fetch progress data');
      }

      // Parse JSON from responses.
      const quizStats = await quizStatsRes.json();
      const flashcardStats = await flashcardStatsRes.json();
      const activityStats = await activityStatsRes.json();

      // Combine all stats into a single state object.
      setStats({ ...quizStats, ...flashcardStats, ...activityStats });
    } catch (err) {
      setError('Could not load your progress. Please try again later.');
      console.error(err); // Log the actual error for debugging.
    } finally {
      setLoading(false);
    }
  };

  // Fetches the detailed study history for the history view.
  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      // --- API PATH CORRECTED ---
      const response = await fetch(`/api/sessions/detailed-history/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      // Ensure history is always an array.
      setHistory(data.history || []);
    } catch (err) {
      setError('Could not load your study history.');
      console.error(err); // Log the actual error for debugging.
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Refreshes data for both the progress and history views.
  const refreshData = async () => {
    setRefreshing(true);
    await fetchProgressData();
    // If the history view is active, refresh its data as well.
    if (showHistory) {
      await fetchHistory();
    }
    setRefreshing(false);
  };

  // Initial data fetch when the component mounts or the user changes.
  useEffect(() => {
    if (user) {
      fetchProgressData();
    }
  }, [user]);

  // --- ADDED: Automatically refetch data on page focus ---
  useEffect(() => {
    const handleFocus = () => {
      // Refetch data when the user returns to this browser tab
      if (user) {
        refreshData();
      }
    };

    // Add event listener for when the window gains focus
    window.addEventListener('focus', handleFocus);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, showHistory]); // Dependencies ensure the latest state is used

  // A small component to display a score with color-coding.
  const ScoreBadge = ({ score }: { score: number }) => {
    const scoreColor = score >= 80 ? 'bg-green-100 text-green-800' : score >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreColor}`}>
        {score.toFixed(0)}%
      </span>
    );
  };

  // Toggles the history view and fetches data if needed.
  const handleShowHistory = async () => {
    // Only fetch history the first time the user clicks "View History".
    if (!showHistory && history.length === 0) { 
      await fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  // --- RENDER LOGIC ---

  if (loading) return <div className="p-6 text-center">Loading progress...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!stats) return <div className="p-6 text-center">No progress data available. Start a session to see your progress!</div>;

  // Calculate progress percentages.
  const quizProgress = stats.totalQuizzes > 0 ? (stats.quizzesCompleted / stats.totalQuizzes) * 100 : 0;
  const flashcardProgress = stats.totalFlashcards > 0 ? (stats.flashcardsReviewed / stats.totalFlashcards) * 100 : 0;

  // --- RENDER HISTORY VIEW ---
  if (showHistory) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">📚 Study History</h1>
          <div className="flex gap-2">
            <Button onClick={handleShowHistory} variant="outline">← Back to Progress</Button>
            <Button onClick={refreshData} disabled={refreshing} variant="outline" size="sm">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        {historyLoading ? (
          <p className="text-center">Loading history...</p>
        ) : (
          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-center text-gray-500">No study history found.</p>
            ) : (
              history.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.category} - {new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div>
                      {item.score !== undefined && <ScoreBadge score={item.score} />}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // --- RENDER MAIN PROGRESS VIEW ---
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📊 Your Progress</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleShowHistory}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            📚 View History
          </Button>
          <Button onClick={refreshData} disabled={refreshing} variant="outline" size="sm">
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
      
      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-sm text-gray-600 mb-2">Study Streak</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.studyStreak} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-sm text-gray-600 mb-2">Study Hours</h3>
            <p className="text-2xl font-bold text-purple-600">{stats.hoursStudied.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-sm text-gray-600 mb-2">Total Sessions</h3>
            <p className="text-2xl font-bold text-green-600">
              {stats.recentActivity?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={quizProgress} className="mb-4" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{stats.quizzesCompleted} completed</span>
              <span>{stats.totalQuizzes} total</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Flashcard Review</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={flashcardProgress} className="mb-4" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{stats.flashcardsReviewed} reviewed</span>
              <span>{stats.totalFlashcards} total</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentProgress;
