import { useState, useEffect, useRef } from 'react';

interface StudySessionData {
  sessionType: 'quiz' | 'flashcard' | 'tutor';
  activity: string;
  category: string;
  score?: number;
}

export const useStudySession = () => {
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const startSession = (sessionData: StudySessionData) => {
    if (isActive) return; // Already active
    
    console.log('Starting study session:', sessionData);
    setIsActive(true);
    setDuration(0);
    startTimeRef.current = new Date();
    
    // Update duration every second
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
        setDuration(elapsed);
      }
    }, 1000);
  };

  const endSession = async (sessionData: StudySessionData) => {
    if (!isActive || !startTimeRef.current) return;
    
    const finalDuration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000 / 60); // minutes
    
    try {
      await fetch('http://localhost:3001/api/study-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sessionData,
          duration: finalDuration
        }),
      });
      
      console.log('Study session ended:', {
        ...sessionData,
        duration: finalDuration
      });
    } catch (error) {
      console.error('Error saving study session:', error);
    }
    
    // Cleanup
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsActive(false);
    setDuration(0);
    startTimeRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isActive,
    duration,
    formatDuration,
    startSession,
    endSession
  };
};
