import { useState, useEffect } from 'react';

export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

// Function to fetch quiz data from your Python backend
export const useQuizData = (pdfName: string) => {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        console.log('=== useQuizData Debug ===');
        console.log('Input pdfName:', pdfName);
        
        setLoading(true);
        setError(null);

        if (!pdfName) {
          console.log('No PDF name provided, setting loading to false');
          setLoading(false);
          return;
        }

        const encodedPdfName = encodeURIComponent(pdfName);
        console.log('Encoded pdfName:', encodedPdfName);
        
        const apiUrl = `http://localhost:3001/api/quiz/${encodedPdfName}`;
        console.log('Fetching from URL:', apiUrl);

        const response = await fetch(apiUrl);
        
        console.log('Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: [...response.headers.entries()]
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log('Error response text:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || `Failed to fetch quiz: ${response.status}`);
          } catch {
            throw new Error(`Failed to fetch quiz: ${response.status} ${response.statusText}`);
          }
        }

        const rawData = await response.json();
        console.log('Raw data received:', rawData);
        console.log('Raw data type:', typeof rawData);
        console.log('Is array:', Array.isArray(rawData));

        // The backend returns an array directly, so we need to wrap it
        if (Array.isArray(rawData)) {
          const formattedData: QuizData = {
            questions: rawData
          };
          console.log('Formatted data:', formattedData);
          setQuizData(formattedData);
        } else if (rawData && Array.isArray(rawData.questions)) {
          // In case backend already returns the correct format
          console.log('Data already in correct format');
          setQuizData(rawData);
        } else {
          console.error('Unexpected data format:', rawData);
          throw new Error('Invalid quiz data format received from server');
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quiz data';
        console.error('Error in useQuizData:', err);
        setError(errorMessage);
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    console.log('useQuizData useEffect triggered with pdfName:', pdfName);
    if (pdfName) {
      fetchQuizData();
    } else {
      console.log('No pdfName, setting loading to false');
      setLoading(false);
    }
  }, [pdfName]);

  console.log('useQuizData returning:', { quizData, loading, error });
  return { quizData, loading, error };
};