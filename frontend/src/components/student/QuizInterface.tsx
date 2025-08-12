import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudySession } from '@/hooks/useStudySession';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
}

interface QuizCard {
  title: string;
  description: string;
  icon: string;
  color: string;
  folder: string;
}

interface UserAnswer {
  questionIndex: number;
  selectedOption: string;
  isCorrect: boolean;
  question: string;
  correctAnswer: string;
}

interface TutorExplanation {
  index: number;
  question: string;
  correct_answer: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  explanation: string;
}

const QuizInterface: React.FC = () => {
  const navigate = useNavigate();
  const { startSession, endSession, isActive, duration, formatDuration } = useStudySession();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showTutorExplanations, setShowTutorExplanations] = useState(false);
  const [tutorExplanations, setTutorExplanations] = useState<TutorExplanation[]>([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);

  // --- ADDED STATE ---
  // This holds the unique ID for each quiz attempt to fetch the correct explanation.
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);

  const categories: QuizCard[] = [
    { title: 'Python',          description: 'Python programming quizzes',   icon: '🐍', color: 'bg-blue-100',    folder: 'python' },
    { title: 'Java',            description: 'Java programming quizzes',     icon: '☕', color: 'bg-red-100',     folder: 'java'   },
    { title: 'C++',             description: 'C++ programming quizzes',      icon: '➕', color: 'bg-green-100',   folder: 'cpp'    },
    { title: 'C',               description: 'C programming quizzes',        icon: '🇨', color: 'bg-yellow-100',  folder: 'c'      },
    { title: 'Mixed Materials', description: 'Various study material quizzes', icon: '📚', color: 'bg-purple-100', folder: 'mixed'  }
  ];

  const fetchQuizList = async (folder: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`http://localhost:3001/api/student/quizzes/${folder}`);
      if (!res.ok) {
        const { error, details } = await res.json();
        throw new Error(details || error || 'Failed to fetch quiz list');
      }
      const json = await res.json();
      const quizNames = (json.quizzes || []).map((quiz: any) => quiz.name);
      setAvailableQuizzes(quizNames);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load quiz list: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuiz = async (folder: string, quizName: string) => {
    setLoading(true); setError(null);
    try {
      const encoded = encodeURIComponent(quizName);
      const res = await fetch(`http://localhost:3001/api/student/quizzes/${folder}/${encoded}`);
      if (!res.ok) {
        const { error, details } = await res.json();
        throw new Error(details || error || 'Failed to fetch quiz');
      }
      const data: QuizQuestion[] = await res.json();
      setQuestions(data);
      setCurrentQuiz(quizName);
      setCurrentQuestion(0);
      setUserAnswers([]);
      setSelectedOption(null);
      setShowResults(false);
      setShowTutorExplanations(false);
      setTutorExplanations([]);
      setTutorError(null);
      setCurrentAttemptId(null); // Reset attempt ID on new quiz start
      
      if (selectedCategory) {
        startSession({
          sessionType: 'quiz',
          activity: quizName,
          category: categories.find(c => c.title === selectedCategory)?.folder || 'mixed'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load quiz: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED FUNCTION ---
  // This function now gets a unique attemptId from the backend and uses it for polling.
  const triggerAiTutor = async () => {
    const currentCategoryFolder = categories.find(c => c.title === selectedCategory)?.folder;
    if (!currentQuiz || !currentCategoryFolder) {
      setTutorError('No quiz or category selected');
      return;
    }

    setTutorLoading(true);
    setTutorError(null);
    setTutorExplanations([]);

    try {
      const triggerRes = await fetch('http://localhost:3001/api/tutor/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizName: currentQuiz,
          userAnswers: userAnswers,
          subject: currentCategoryFolder
        }),
      });

      if (!triggerRes.ok) {
        throw new Error('Failed to trigger AI tutor process.');
      }

      const triggerData = await triggerRes.json();
      const attemptId = triggerData.attemptId;

      if (!attemptId) {
        throw new Error('Could not get a valid attempt ID from the server.');
      }
      
      setCurrentAttemptId(attemptId); // Store the ID for polling

      const pollInterval = 5000;
      const pollTimeout = 180000;

      const pollId = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:3001/api/tutor/explanations/${encodeURIComponent(currentQuiz)}/${attemptId}`);
          if (res.ok) {
            const explanations = await res.json();
            setTutorExplanations(explanations);
            setShowTutorExplanations(true);
            setTutorLoading(false);
            clearInterval(pollId);
            clearTimeout(timeoutId);
          }
        } catch (pollError) {
          // Continue polling
        }
      }, pollInterval);

      const timeoutId = setTimeout(() => {
        clearInterval(pollId);
        setTutorError('The AI tutor timed out. Please try again.');
        setTutorLoading(false);
      }, pollTimeout);

    } catch (error) {
      setTutorError(error instanceof Error ? error.message : 'Failed to trigger AI tutor');
      setTutorLoading(false);
    }
  };

  const handleCardSelect = (cat: QuizCard) => {
    setSelectedCategory(cat.title);
    setAvailableQuizzes([]);
    setQuestions([]);
    setCurrentQuiz(null);
    setShowResults(false);
    setShowTutorExplanations(false);
    setTutorExplanations([]);
    fetchQuizList(cat.folder);
  };

  const returnToQuizList = async () => {
    if (currentQuiz && selectedCategory) {
      await endSession({
        sessionType: 'quiz',
        activity: currentQuiz,
        category: categories.find(c => c.title === selectedCategory)?.folder || 'mixed'
      });
    }
    setQuestions([]);
    setCurrentQuiz(null);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setShowResults(false);
    setShowTutorExplanations(false);
    setTutorExplanations([]);
    setCurrentAttemptId(null);
  };

  const backButton = async () => {
    if (showTutorExplanations) {
      setShowTutorExplanations(false);
    } else if (showResults || questions.length) {
      await returnToQuizList();
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setAvailableQuizzes([]);
    } else {
      navigate(-1);
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleNextQuestion = () => {
    if (!selectedOption) return;

    const currentQ = questions[currentQuestion];
    const isCorrect = selectedOption === currentQ.answer;

    const newAnswer: UserAnswer = {
      questionIndex: currentQuestion,
      selectedOption,
      isCorrect,
      question: currentQ.question,
      correctAnswer: currentQ.answer
    };

    const updatedAnswers = [...userAnswers, newAnswer];
    setUserAnswers(updatedAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
    } else {
      handleQuizComplete(updatedAnswers);
    }
  };

  const handleQuizComplete = async (answers: UserAnswer[]) => {
    const score = answers.filter(a => a.isCorrect).length;
    const percentage = Math.round((score / questions.length) * 100);
    
    await saveUserAnswers(answers);
    
    if (currentQuiz && selectedCategory) {
      await endSession({
        sessionType: 'quiz',
        activity: currentQuiz,
        category: categories.find(c => c.title === selectedCategory)?.folder || 'mixed',
        score: percentage
      });
    }
    setShowResults(true);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      const prevAnswer = userAnswers[currentQuestion - 1];
      setSelectedOption(prevAnswer?.selectedOption || null);
      setUserAnswers(userAnswers.slice(0, currentQuestion));
    }
  };

  const saveUserAnswers = async (answers: UserAnswer[]) => {
    try {
      const score = answers.filter(a => a.isCorrect).length;
      const payload = {
        pdfName: currentQuiz,
        answers: answers,
        timestamp: new Date().toISOString(),
        totalScore: score,
        totalQuestions: questions.length,
        score: Math.round((score / questions.length) * 100),
        category: categories.find(c => c.title === selectedCategory)?.folder || 'mixed'
      };

      await fetch('http://localhost:3001/api/user-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to save user answers:', err);
    }
  };

  const restartQuiz = async () => {
    if (currentQuiz && selectedCategory) {
      await endSession({
        sessionType: 'quiz',
        activity: currentQuiz,
        category: categories.find(c => c.title === selectedCategory)?.folder || 'mixed'
      });
    }
    
    setCurrentQuestion(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setShowResults(false);
    setShowTutorExplanations(false);
    setTutorExplanations([]);
    setCurrentAttemptId(null);
    
    if (currentQuiz && selectedCategory) {
      startSession({
        sessionType: 'quiz',
        activity: currentQuiz,
        category: categories.find(c => c.title === selectedCategory)?.folder || 'mixed'
      });
    }
  };

  const currentQ = questions[currentQuestion];
  const score = userAnswers.filter(a => a.isCorrect).length;
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const wrongAnswers = userAnswers.filter(a => !a.isCorrect);

  return (
    <div className="min-h-screen bg-gray-50">
      {isActive && (
        <div className="fixed top-4 right-4 bg-blue-100 px-3 py-2 rounded-lg shadow-md z-20">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">⏱️</span>
            <span className="text-sm font-medium text-blue-800">
              Study Time: {formatDuration(duration)}
            </span>
          </div>
        </div>
      )}
      <div className="absolute top-4 left-4 z-10">
        <Button variant="outline" size="sm" onClick={backButton} className="flex items-center gap-2 bg-white hover:bg-gray-50">
          <span className="text-lg">‹</span> Back
        </Button>
      </div>

      <div className="min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4">

          {!selectedCategory && (
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Quizzes</h1>
              <p className="text-gray-600 mb-8">Choose a category to take a quiz</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {categories.map((cat, i) => (
                  <Card key={i} className="border hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCardSelect(cat)}>
                    <CardContent className="p-0">
                      <div className={`${cat.color} p-6 text-center`}>
                        <span className="text-4xl">{cat.icon}</span>
                      </div>
                      <div className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">{cat.title}</h2>
                        <p className="text-gray-600 text-sm mb-4">{cat.description}</p>
                        <Button variant="outline" className="w-full">Take Quiz</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {selectedCategory && !questions.length && !showResults && !showTutorExplanations && (
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {selectedCategory} Quizzes
              </h1>
              <p className="text-gray-600 mb-8">Select a quiz to begin</p>

              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                  <p className="ml-4 text-gray-600">Loading…</p>
                </div>
              )}

              {error && (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={() => fetchQuizList(categories.find(c => c.title === selectedCategory)!.folder)}>
                    Try Again
                  </Button>
                </div>
              )}

              {!loading && !error && (
                availableQuizzes.length
                  ? <div className="grid gap-4">
                      {availableQuizzes.map((quizName, i) => (
                        <Card key={i}
                              className="border hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => fetchQuiz(categories.find(c => c.title === selectedCategory)!.folder, quizName)}>
                          <CardContent className="p-6 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <span className="text-blue-500 text-2xl">📝</span>
                              <span className="font-semibold text-gray-800">{quizName}</span>
                            </div>
                            <Button variant="outline" size="sm">Start Quiz</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  : <div className="py-12 text-gray-600">No quizzes found.</div>
              )}
            </div>
          )}

          {questions.length > 0 && !showResults && !showTutorExplanations && currentQ && (
            <div className="text-center max-w-3xl mx-auto">
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Question {currentQuestion + 1} of {questions.length}</span>
                  {isActive && (
                    <span>Time: {formatDuration(duration)}</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <Card className="mb-8">
                <CardContent className="p-8">
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-8 leading-relaxed">
                    {currentQ.question}
                  </h2>
                  <div className="grid gap-4">
                    {Object.entries(currentQ.options).map(([key, value]) => (
                      <Card
                        key={key}
                        className={`cursor-pointer border-2 transition-all duration-200 ${
                          selectedOption === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleOptionSelect(key)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                              selectedOption === key
                                ? 'border-blue-500 bg-blue-500 text-white'
                                : 'border-gray-300 text-gray-600'
                            }`}>
                              {key}
                            </div>
                            <span className="text-left text-gray-800">{value}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0}
                >
                  ← Previous
                </Button>

                <Button
                  onClick={handleNextQuestion}
                  disabled={!selectedOption}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next →'}
                </Button>
              </div>
            </div>
          )}

          {showResults && !showTutorExplanations && (
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Quiz Results</h1>

              <Card className="mb-8 bg-gradient-to-r from-blue-50 to-green-50">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-gray-800 mb-2">
                      {score}/{questions.length}
                    </div>
                    <div className="text-xl text-gray-600 mb-4">
                      {Math.round((score / questions.length) * 100)}% Correct
                    </div>
                    <div className="text-gray-500">
                      You got {score} out of {questions.length} questions correct
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                      Study time: {isActive ? formatDuration(duration) : 'Session completed'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {wrongAnswers.length > 0 && (
                <Card className="mb-8 bg-yellow-50 border-yellow-200">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        You got {wrongAnswers.length} question{wrongAnswers.length > 1 ? 's' : ''} wrong
                      </h3>
                      <p className="text-yellow-700 mb-4">
                        Want to understand why these answers were incorrect?
                      </p>
                      
                      {tutorError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                          {tutorError}
                        </div>
                      )}
                      
                      <Button
                        onClick={triggerAiTutor}
                        disabled={tutorLoading}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                      >
                        {tutorLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating explanations...
                          </>
                        ) : (
                          'Learn from your mistakes'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 mb-8 text-left">
                {userAnswers.map((answer, index) => (
                  <Card key={index} className={`border-l-4 ${answer.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-gray-800 flex-1">
                          Q{index + 1}: {answer.question}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          answer.isCorrect 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex gap-4">
                          <span className="text-gray-600">Your answer:</span>
                          <span className={answer.isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {answer.selectedOption}: {questions[index]?.options[answer.selectedOption as keyof typeof questions[0]['options']]}
                          </span>
                        </div>
                        {!answer.isCorrect && (
                          <div className="flex gap-4">
                            <span className="text-gray-600">Correct answer:</span>
                            <span className="text-green-600 font-medium">
                              {answer.correctAnswer}: {questions[index]?.options[answer.correctAnswer as keyof typeof questions[0]['options']]}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={restartQuiz}>
                  Retake Quiz
                </Button>
                <Button onClick={returnToQuizList} className="bg-blue-600 hover:bg-blue-700">
                  Back to Quizzes
                </Button>
              </div>
            </div>
          )}

          {showTutorExplanations && (
            <div className="text-center max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  AI Tutor Explanations
                </h1>
                <p className="text-gray-600">
                  Here are detailed explanations for the questions you answered incorrectly
                </p>
              </div>

              {tutorLoading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating AI explanations...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                </div>
              )}

              {tutorError && (
                <div className="text-center py-8">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                    <h3 className="text-red-800 font-semibold mb-2">Error</h3>
                    <p className="text-red-700 text-sm">{tutorError}</p>
                  </div>
                </div>
              )}

              {!tutorLoading && !tutorError && tutorExplanations.length > 0 && (
                <div className="space-y-6 text-left">
                  {tutorExplanations.map((explanation, index) => (
                    <Card key={index} className="border-l-4 border-yellow-500">
                      <CardContent className="p-6">
                        <div className="mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-yellow-100 text-yellow-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                              {explanation.index}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Question {explanation.index}
                            </h3>
                          </div>
                          <p className="text-gray-700 mb-4">{explanation.question}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-red-50 p-3 rounded">
                            <p className="text-sm font-medium text-red-800 mb-1">Your Answer</p>
                            <p className="text-red-700">
                              {(() => {
                                const userAnswer = userAnswers[explanation.index - 1];
                                return userAnswer ? `${userAnswer.selectedOption}: ${questions[explanation.index - 1]?.options[userAnswer.selectedOption as keyof typeof questions[0]['options']]}` : 'No answer';
                              })()}
                            </p>
                          </div>
                          <div className="bg-green-50 p-3 rounded">
                            <p className="text-sm font-medium text-green-800 mb-1">Correct Answer</p>
                            <p className="text-green-700">
                              {explanation.correct_answer}: {explanation.options[explanation.correct_answer as keyof typeof explanation.options]}
                            </p>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-2">Explanation</p>
                          <div className="text-blue-700 whitespace-pre-wrap">
                            {explanation.explanation}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!tutorLoading && !tutorError && tutorExplanations.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No explanations available yet.</p>
                  <p className="text-sm text-gray-500 mt-2">The AI tutor may still be processing your request.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;