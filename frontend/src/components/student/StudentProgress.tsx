import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- ADDED
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../auth/auth';

// Interfaces for our data structures
interface ProgressStats {
  quizzesCompleted: number;
  decksReviewed: number;
  cardsReviewedTotal?: number;
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
  const navigate = useNavigate(); // <-- ADDED
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
    if (!stats) setLoading(true);
    setError(null);
    try {
      const [quizStatsRes, flashcardStatsRes, activityStatsRes] = await Promise.all([
        fetch(`/api/sessions/quiz-stats/${user.id}`),
        fetch(`/api/sessions/flashcard-stats/${user.id}`),
        fetch(`/api/sessions/activity-stats/${user.id}`)
      ]);

      if (!quizStatsRes.ok || !flashcardStatsRes.ok || !activityStatsRes.ok) {
        throw new Error('Failed to fetch progress data');
      }

      const quizStats = await quizStatsRes.json();
      const flashcardStats = await flashcardStatsRes.json();
      const activityStats = await activityStatsRes.json();

      setStats({ ...quizStats, ...flashcardStats, ...activityStats });
    } catch (err) {
      setError('Could not load your progress. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetches the detailed study history for the history view.
  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/sessions/detailed-history/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      setError('Could not load your study history.');
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Refreshes data for both the progress and history views.
  const refreshData = async () => {
    setRefreshing(true);
    await fetchProgressData();
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

  // Automatically refetch data on page focus.
  useEffect(() => {
    const handleFocus = () => {
      if (user) refreshData();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, showHistory]);

  const ScoreBadge = ({ score }: { score: number }) => {
    const scoreColor = score >= 80 ? 'bg-green-100 text-green-800' : score >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreColor}`}>
        {score.toFixed(0)}%
      </span>
    );
  };
  
  const handleShowHistory = async () => {
    if (!showHistory && history.length === 0) { 
      await fetchHistory();
    }
    setShowHistory(!showHistory);
  };
  
  // ADDED: Handler for the new back button
  const handleBack = () => {
    if (showHistory) {
      setShowHistory(false);
    } else {
      navigate(-1);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading progress...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!stats) return <div className="p-6 text-center">No progress data available.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ADDED: The new back button, positioned absolutely */}
      <div className="absolute top-4 left-4 z-10">
        <Button variant="outline" size="sm" onClick={handleBack} className="flex items-center gap-2 bg-white hover:bg-gray-50">
          <span className="text-lg">‹</span> Back
        </Button>
      </div>

      {/* Main content wrapper */}
      <div className="min-h-screen flex items-center justify-center p-6">
        {showHistory ? (
          // --- RENDER HISTORY VIEW ---
          <div className="space-y-6 max-w-6xl w-full">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">📚 Study History</h1>
              <Button onClick={refreshData} disabled={refreshing} variant="outline" size="sm">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
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
        ) : (
          // --- RENDER MAIN PROGRESS VIEW ---
          <div className="space-y-8 max-w-4xl w-full mt-12 md:mt-0">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">📊 Your Progress</h1>
              <div className="flex gap-2">
                <Button onClick={handleShowHistory} className="bg-purple-600 hover:bg-purple-700 text-white">
                  📚 View History
                </Button>
                <Button onClick={refreshData} disabled={refreshing} variant="outline" size="sm">
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Study Streak</h3>
                  <p className="text-3xl font-bold text-blue-600">{stats.studyStreak} days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Study Hours</h3>
                  <p className="text-3xl font-bold text-purple-600">{stats.hoursStudied.toFixed(1)}h</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                  <CardHeader><CardTitle>Quiz Completion</CardTitle></CardHeader>
                  <CardContent>
                      <p className="text-3xl font-bold text-green-600">{stats.quizzesCompleted}</p>
                      <p className="text-sm text-gray-500 mt-1">Unique quizzes completed so far.</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader><CardTitle>Flashcard Review</CardTitle></CardHeader>
                  <CardContent>
                      <p className="text-3xl font-bold text-orange-600">{stats.decksReviewed}</p>
                      <p className="text-sm text-gray-500 mt-1">Unique flashcard decks reviewed.</p>
                  </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">⭐ Recent Activity</h2>
              <div className="space-y-3">
                  {stats.recentActivity.length > 0 ? (
                      stats.recentActivity.map((activity, index) => (
                          <Card key={`${activity.date}-${index}`}>
                              <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                                  <div className='flex-grow'>
                                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${activity.type === 'quiz' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                          {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                                      </span>
                                      <p className="font-semibold mt-1">{activity.name}</p>
                                  </div>
                                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                                      <p className="text-sm text-gray-500">{new Date(activity.date).toLocaleDateString()}</p>
                                      {activity.score !== undefined && <ScoreBadge score={activity.score} />}
                                  </div>
                              </CardContent>
                          </Card>
                      ))
                  ) : (
                      <p className="text-center text-gray-500 py-4">You have no recent activity.</p>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProgress;