/*  src/components/student/FlashcardInterface.tsx  */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudySession } from '@/hooks/useStudySession';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardCard {
  title: string;
  description: string;
  icon: string;
  color: string;
  folder: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
const FlashcardInterface: React.FC = () => {
  const navigate = useNavigate();
  
  // Add the study session hook
  const { startSession, endSession, isActive, duration, formatDuration } = useStudySession();

  /* --------------------------------- state -------------------------------- */
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availableSets, setAvailableSets] = useState<string[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session tracking states
  const [currentFlashcardSet, setCurrentFlashcardSet] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [cardsReviewed, setCardsReviewed] = useState<Set<number>>(new Set());
  const [sessionTracked, setSessionTracked] = useState(false);

  // Ref to track if component is unmounting
  const isUnmounting = useRef(false);

  /* --------------------------- category metadata -------------------------- */
  const categories: FlashcardCard[] = [
    { title: 'Python', description: 'Python programming concepts', icon: '🐍', color: 'bg-blue-100', folder: 'python' },
    { title: 'Java', description: 'Java programming concepts', icon: '☕', color: 'bg-red-100', folder: 'java' },
    { title: 'C++', description: 'C++ programming concepts', icon: '➕', color: 'bg-green-100', folder: 'cpp' },
    { title: 'C', description: 'C programming concepts', icon: '🇨', color: 'bg-yellow-100', folder: 'c' },
    { title: 'Mixed Materials', description: 'Various study materials', icon: '📚', color: 'bg-purple-100', folder: 'mixed' }
  ];

  /* ------------------------------------------------------------------------ */
  /*  Session Tracking Functions                                             */
  /* ------------------------------------------------------------------------ */
  const trackFlashcardSession = async (flashcardName: string, cardsReviewedCount: number, sessionDuration: number, category: string) => {
  try {
    console.log('Tracking flashcard session:', {
      flashcardName,
      cardsReviewedCount,
      sessionDuration: `${sessionDuration} minutes`, // Clarify the unit
      category
    });

    const response = await fetch('http://localhost:3001/api/flashcard-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flashcardName,
        cardsReviewed: cardsReviewedCount,
        sessionDuration, // This should be in minutes
        timestamp: new Date().toISOString(),
        category
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    console.log('Flashcard session tracked successfully');
  } catch (error) {
    console.error('Failed to track flashcard session:', error);
  }
};


  const startFlashcardSession = (setName: string) => {
    setCurrentFlashcardSet(setName);
    setSessionStartTime(Date.now());
    setCardsReviewed(new Set());
    setSessionTracked(false);
    console.log('Started flashcard session for:', setName);
    
    // Start the new study session tracking
    if (selectedCategory) {
      startSession({
        sessionType: 'flashcard',
        activity: setName,
        category: categories.find(c => c.title === selectedCategory)?.folder || 'mixed'
      });
    }
  };

  const endFlashcardSession = async () => {
  // More robust duplicate prevention
  if (!currentFlashcardSet || !sessionStartTime || sessionTracked) {
    console.log('Session end skipped:', {
      hasFlashcardSet: !!currentFlashcardSet,
      hasStartTime: !!sessionStartTime,
      alreadyTracked: sessionTracked
    });
    return;
  }

  console.log('Ending flashcard session...', {
    currentFlashcardSet,
    sessionStartTime,
    cardsReviewedSize: cardsReviewed.size,
    sessionTracked
  });

  // Set flag IMMEDIATELY to prevent multiple calls
  setSessionTracked(true);

  if (cardsReviewed.size > 0) {
    const sessionDuration = Date.now() - sessionStartTime;
    const sessionDurationInMinutes = Math.max(1, Math.round(sessionDuration / 60000)); // At least 1 minute
    const category = categories.find(c => c.title === selectedCategory)?.folder || 'mixed';
    
    console.log('Session duration calculation:', {
      startTime: sessionStartTime,
      endTime: Date.now(),
      durationMs: sessionDuration,
      durationMinutes: sessionDurationInMinutes
    });
    
    // Track the old flashcard session
    await trackFlashcardSession(
      currentFlashcardSet,
      cardsReviewed.size,
      sessionDurationInMinutes,
      category
    );
  }
  
  // End the new study session tracking
  if (currentFlashcardSet && selectedCategory) {
    await endSession({
      sessionType: 'flashcard',
      activity: currentFlashcardSet,
      category: categories.find(c => c.title === selectedCategory)?.folder || 'mixed'
    });
  }
};



  // Track card as reviewed when user views the answer
  const markCardAsReviewed = () => {
    if (showAnswer) {
      setCardsReviewed(prev => new Set(prev).add(current));
    }
  };

  /* ------------------------------------------------------------------------ */
  /*  Effect Hooks for Session Tracking                                      */
  /* ------------------------------------------------------------------------ */
  
  // Track when user views answer
  useEffect(() => {
    markCardAsReviewed();
  }, [showAnswer, current]);

  // Track session on component unmount or when leaving flashcards
  useEffect(() => {
    const handleBeforeUnload = () => {
      isUnmounting.current = true;
      if (currentFlashcardSet && sessionStartTime && cardsReviewed.size > 0 && !sessionTracked) {
        // For page refresh/close, use navigator.sendBeacon for reliability
        const sessionDuration = Date.now() - sessionStartTime;
        const category = categories.find(c => c.title === selectedCategory)?.folder || 'mixed';
        
        const data = JSON.stringify({
          flashcardName: currentFlashcardSet,
          cardsReviewed: cardsReviewed.size,
          sessionDuration,
          timestamp: new Date().toISOString(),
          category
        });

        navigator.sendBeacon('http://localhost:3001/api/flashcard-session', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Track session when component unmounts normally
      if (!isUnmounting.current) {
        endFlashcardSession();
      }
    };
  }, [currentFlashcardSet, sessionStartTime, cardsReviewed.size, sessionTracked, selectedCategory]);

  /* ------------------------------------------------------------------------ */
  /*  Data fetch helpers                                                      */
  /* ------------------------------------------------------------------------ */
  const fetchSetList = async (folder: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`http://localhost:3001/api/flashcards/${folder}`);
      if (!res.ok) {
        const { error, details } = await res.json();
        throw new Error(details || error || 'Failed to fetch flashcard list');
      }
      const json = await res.json();
      setAvailableSets(json.flashcards || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load flashcard list: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlashcards = async (folder: string, setName: string) => {
    setLoading(true); setError(null);
    try {
      const encoded = encodeURIComponent(setName);
      const res = await fetch(`http://localhost:3001/api/flashcards/${folder}/${encoded}`);
      if (!res.ok) {
        const { error, details } = await res.json();
        throw new Error(details || error || 'Failed to fetch flashcards');
      }
      const data: Flashcard[] = await res.json();
      setFlashcards(data);
      setCurrent(0);
      setShowAnswer(false);
      
      // Start session tracking (both old and new systems)
      startFlashcardSession(setName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load flashcards: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*  Navigation helpers                                                      */
  /* ------------------------------------------------------------------------ */
  const handleCardSelect = (cat: FlashcardCard) => {
    setSelectedCategory(cat.title);
    setAvailableSets([]);
    setFlashcards([]);
    fetchSetList(cat.folder);
  };

  const backButton = async () => {
    if (flashcards.length) {
      // End session before going back
      await endFlashcardSession();
      setFlashcards([]); setCurrent(0); setShowAnswer(false);
      setCurrentFlashcardSet(null);
      setSessionStartTime(null);
      setCardsReviewed(new Set());
    } else if (selectedCategory) {
      setSelectedCategory(null); setAvailableSets([]);
    } else {
      navigate(-1);
    }
  };

  const completeSession = async () => {
    // End session when completing
    await endFlashcardSession();
    setFlashcards([]);
    setCurrent(0);
    setShowAnswer(false);
    setCurrentFlashcardSet(null);
    setSessionStartTime(null);
    setCardsReviewed(new Set());
  };

  /* ------------------------------------------------------------------------ */
  /*  Practice controls                                                       */
  /* ------------------------------------------------------------------------ */
  const next = () => {
    if (current < flashcards.length - 1) {
      setCurrent(cur => cur + 1);
      setShowAnswer(false);
    }
  };

  const prev = () => {
    if (current > 0) {
      setCurrent(cur => cur - 1);
      setShowAnswer(false);
    }
  };

  const flip = () => setShowAnswer(a => !a);

  const currentCard = flashcards[current] ?? null;

  /* ------------------------------------------------------------------------ */
  /*  Render                                                                  */
  /* ------------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Study Timer (NEW) ─────────────────────────────────────────── */}
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

      {/* ─── fixed back button ─────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 z-10">
        <Button variant="outline" size="sm" onClick={backButton} className="flex items-center gap-2 bg-white hover:bg-gray-50">
          <span className="text-lg">‹</span> Back
        </Button>
      </div>

      {/* ─── main content ──────────────────────────────────────────────── */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4">

          {/* ── 1. category selection ────────────────────────────────── */}
          {!selectedCategory && (
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Flashcards</h1>
              <p className="text-gray-600 mb-8">Choose a category to practice</p>

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
                        <Button variant="outline" className="w-full">View Flashcards</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── 2. set list inside a category ────────────────────────── */}
          {selectedCategory && !flashcards.length && (
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {selectedCategory} Flashcards
              </h1>
              <p className="text-gray-600 mb-8">Select a set to begin practice</p>

              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                  <p className="ml-4 text-gray-600">Loading…</p>
                </div>
              )}

              {error && (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={() => fetchSetList(categories.find(c => c.title === selectedCategory)!.folder)}>
                    Try Again
                  </Button>
                </div>
              )}

              {!loading && !error && (
                availableSets.length
                  ? <div className="grid gap-4">
                      {availableSets.map((setName, i) => (
                        <Card key={i}
                              className="border hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => fetchFlashcards(categories.find(c => c.title === selectedCategory)!.folder, setName)}>
                          <CardContent className="p-6 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <span className="text-green-500 text-2xl">📝</span>
                              <span className="font-semibold text-gray-800">{setName}</span>
                            </div>
                            <Button variant="outline" size="sm">Practice</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  : <div className="py-12 text-gray-600">No flashcard sets found.</div>
              )}
            </div>
          )}

          {/* ── 3. practice view ─────────────────────────────────────── */}
          {flashcards.length > 0 && (
            <div className="text-center max-w-2xl mx-auto">

              {/* progress line */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Card {current + 1} of {flashcards.length}</span>
                  <span>Reviewed: {cardsReviewed.size} cards</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((current + 1) / flashcards.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* flashcard */}
              <Card className="mb-8 min-h-[300px] cursor-pointer" onClick={flip}>
                <CardContent className="p-8 flex flex-col justify-center min-h-[300px]">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-4">{showAnswer ? 'Answer' : 'Question'}</div>
                    <div className="text-lg md:text-xl text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {showAnswer ? currentCard!.answer : currentCard!.question}
                    </div>
                    <div className="mt-6 text-sm text-gray-400">
                      Click to {showAnswer ? 'show question' : 'reveal answer'}
                    </div>
                    {cardsReviewed.has(current) && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Reviewed
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* navigation controls */}
              <div className="flex justify-between items-center mb-6">
                <Button variant="outline" onClick={prev} disabled={current === 0}>← Previous</Button>
                <Button variant="outline" onClick={next} disabled={current === flashcards.length - 1}>Next →</Button>
              </div>

              {/* action buttons */}
              <div className="flex justify-center gap-4 mb-4">
                <Button onClick={completeSession} className="bg-green-600 hover:bg-green-700">Back to Flashcards</Button>
                {current === flashcards.length - 1 && (
                  <Button onClick={completeSession} className="bg-blue-600 hover:bg-blue-700">Complete Session</Button>
                )}
              </div>

              {/* stats */}
              <div className="text-sm text-gray-500">
                Progress: {Math.round(((current + 1) / flashcards.length) * 100)}% • 
                Cards Reviewed: {cardsReviewed.size}/{flashcards.length} • 
                Session Time: {sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : 0} min
                {isActive && ` • Live Timer: ${formatDuration(duration)}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashcardInterface;
