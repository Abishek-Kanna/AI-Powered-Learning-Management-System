import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../auth/auth';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate

// Interface for the detailed explanation of a single question
interface Explanation {
  index: number;
  question: string;
  correct_answer: string;
  user_answer: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  explanation: string;
}

// Interface for a single history session in the list
interface HistorySession {
  filename: string;
  quizName: string;
  date: string;
}

const TutorInterface: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // 2. Initialize the navigate function
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<HistorySession | null>(null);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect to fetch the history list when the component loads
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      fetch(`/api/tutor/history/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setHistory(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load history:", err);
          setError("Could not load your tutor history.");
          setLoading(false);
        });
    }
  }, [user]);

  // Function to fetch the content of a selected session
  const viewSessionDetails = (session: HistorySession) => {
    if (!user?.id) return;
    setLoading(true);
    setSelectedSession(session);
    fetch(`/api/tutor/history/${user.id}/${session.filename}`)
      .then((res) => res.json())
      .then((data) => {
        setExplanations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load explanations:", err);
        setError(`Could not load details for ${session.quizName}.`);
        setLoading(false);
      });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 3. Add the Back to Dashboard button */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
          &larr; Back to Dashboard
        </Button>
      </div>

      {/* Conditional rendering for the two views */}
      {selectedSession ? (
        // --- DETAILED EXPLANATION VIEW ---
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setSelectedSession(null)}>
            &larr; Back to History
          </Button>
          <h1 className="text-3xl font-bold">🤖 AI Tutor Feedback</h1>
          <h2 className="text-xl text-muted-foreground">{selectedSession.quizName} - {selectedSession.date}</h2>
          {loading && <p>Loading explanations...</p>}
          {explanations.map((exp) => (
            <Card key={exp.index}>
              <CardHeader>
                <CardTitle>Q{exp.index}. {exp.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-red-600"><strong>Your Answer:</strong> {exp.user_answer}</div>
                <div className="text-sm text-green-600"><strong>Correct Answer:</strong> {exp.correct_answer}</div>
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-semibold mb-2">Explanation</h3>
                  <p className="text-sm whitespace-pre-wrap">{exp.explanation}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // --- HISTORY LIST VIEW ---
        <div>
          <h1 className="text-3xl font-bold mb-6">🤖 AI Tutor History</h1>
          {loading && <p>Loading your history...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && history.length === 0 && (
            <p className="text-muted-foreground">You have no saved AI Tutor sessions. After completing a quiz and getting feedback, your sessions will appear here.</p>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {history.map((session) => (
              <Card key={session.filename} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => viewSessionDetails(session)}>
                <CardHeader>
                  <CardTitle>{session.quizName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{session.date}</p>
                  <Button variant="link" className="p-0 mt-4">View Details &rarr;</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorInterface;