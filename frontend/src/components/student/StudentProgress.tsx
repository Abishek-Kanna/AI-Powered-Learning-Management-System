import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProgressStats {
  quizzesCompleted: number;
  totalQuizzes: number;
  flashcardsReviewed: number;
  totalFlashcards: number;
  hoursStudied: number;
  // Enhanced stats (removed averageScore)
  improvementRate: number;
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
  weakAreas: Array<{
    topic: string;
    accuracy: number;
    questionsAttempted: number;
  }>;
}

interface HistoryItem {
  id: string;
  type: 'quiz' | 'flashcard';
  name: string;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  cardsReviewed?: number;
  duration: number;
  timestamp: string;
  category: string;
  answers?: any[];
}

const StudentProgress: React.FC = () => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [quizStats, flashcardStats, userActivity] = await Promise.all([
        fetch('http://localhost:3001/api/user-progress/quiz-stats').then(res => res.json()),
        fetch('http://localhost:3001/api/user-progress/flashcard-stats').then(res => res.json()),
        fetch('http://localhost:3001/api/user-progress/activity-stats').then(res => res.json())
      ]);

      const progressData: ProgressStats = {
        ...quizStats,
        ...flashcardStats,
        ...userActivity
      };

      setStats(progressData);
    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await fetch('http://localhost:3001/api/user-progress/detailed-history');
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchProgressData();
    if (showHistory) {
      await fetchHistory();
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchProgressData();
  }, []);

  const ScoreBadge = ({ score }: { score: number }) => {
    const isGood = score >= 80;
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isGood 
          ? 'bg-green-100 text-green-800' 
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        {score.toFixed(0)}%
      </span>
    );
  };

  const handleShowHistory = async () => {
    if (!showHistory) {
      await fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          {[1, 2, 3].map(i => (
            <Card key={i} className="mb-4">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refreshData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  const quizProgress = stats.totalQuizzes > 0 ? (stats.quizzesCompleted / stats.totalQuizzes) * 100 : 0;
  const flashcardProgress = stats.totalFlashcards > 0 ? (stats.flashcardsReviewed / stats.totalFlashcards) * 100 : 0;

  if (showHistory) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">📚 Study History</h1>
            <p className="text-gray-600">Your complete learning journey</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleShowHistory} variant="outline">
              ← Back to Dashboard
            </Button>
            <Button 
              onClick={refreshData} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* History Content */}
        {historyLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading history...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">No study history found yet.</p>
                  <p className="text-sm text-gray-500 mt-2">Complete some quizzes or flashcard sessions to see your history here.</p>
                </CardContent>
              </Card>
            ) : (
              history.map((item, index) => (
                <Card key={item.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {item.type === 'quiz' ? '📝' : '🎴'}
                          </span>
                          <div>
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            <p className="text-sm text-gray-600 capitalize">
                              {item.category} • {item.type}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          {item.type === 'quiz' ? (
                            <>
                              <div>
                                <p className="text-sm text-gray-600">Score</p>
                                <p className="font-semibold text-lg">{item.score}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Questions</p>
                                <p className="font-semibold">{item.correctAnswers}/{item.totalQuestions}</p>
                              </div>
                            </>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600">Cards Reviewed</p>
                              <p className="font-semibold text-lg">{item.cardsReviewed}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600">Duration</p>
                            <p className="font-semibold">{item.duration} min</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-semibold text-sm">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {item.type === 'quiz' && item.score && (
                          <ScoreBadge score={item.score} />
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
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

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📊 Your Progress</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleShowHistory}
            className="bg-purple-600 hover:bg-purple-700"
          >
            📚 View History
          </Button>
          <Button 
            onClick={refreshData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Overview Cards (removed average score) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {(stats.recentActivity?.length || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rest of your existing components... */}
      {/* Main Progress Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz Progress */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Quiz Completion</h2>
            <Progress value={quizProgress} className="mb-4" />
            <div className="flex justify-between text-sm text-gray-600 mb-4">
              <span>{stats.quizzesCompleted} completed</span>
              <span>{stats.totalQuizzes} total</span>
            </div>
            
            {stats.categoryBreakdown && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">By Category:</h4>
                {Object.entries(stats.categoryBreakdown).map(([category, data]) => (
                  <div key={category} className="flex justify-between items-center text-sm">
                    <span className="capitalize">{category}</span>
                    <div className="flex items-center gap-2">
                      <span>{data.quizzesCompleted}/{data.totalQuizzes}</span>
                      <ScoreBadge score={data.averageScore} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flashcard Progress */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Flashcard Review</h2>
            <Progress value={flashcardProgress} className="mb-4" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{stats.flashcardsReviewed} reviewed</span>
              <span>{stats.totalFlashcards} total</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {stats.recentActivity && stats.recentActivity.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Recent Activity</h2>
              <Button 
                onClick={handleShowHistory}
                variant="outline"
                size="sm"
              >
                View All →
              </Button>
            </div>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{activity.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{activity.category} • {activity.type}</p>
                  </div>
                  <div className="text-right">
                    {activity.score && <ScoreBadge score={activity.score} />}
                    {activity.cardsReviewed && (
                      <span className="text-sm text-gray-600">{activity.cardsReviewed} cards</span>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement */}
      {stats.weakAreas && stats.weakAreas.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Areas for Improvement</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.weakAreas.map((area, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">{area.topic}</h4>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Accuracy: {area.accuracy.toFixed(1)}%</span>
                    <span>{area.questionsAttempted} questions</span>
                  </div>
                  <Progress value={area.accuracy} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentProgress;
