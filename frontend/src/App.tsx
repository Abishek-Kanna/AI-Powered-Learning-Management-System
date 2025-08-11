import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage, { AuthProvider } from './components/auth/auth'; 
import StudentDashboard from './components/student/StudentDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import QuizInterface from './components/student/QuizInterface';
import FlashcardInterface from './components/student/FlashcardInterface';
import TutorInterface from './components/student/TutorInterface';
import StudyMaterials from './components/student/StudyMaterials';
import StudentProgress from './components/student/StudentProgress';
import MaterialLearningHub from './components/student/MaterialLearningHub';
import MaterialUpload from './components/teacher/MaterialUpload';
import CodingPractice from './components/student/CodingPractice';

// TypeScript interfaces for Error Boundary
interface QuizErrorBoundaryProps {
  children: React.ReactNode;
}

interface QuizErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component
class QuizErrorBoundary extends React.Component<QuizErrorBoundaryProps, QuizErrorBoundaryState> {
  constructor(props: QuizErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): QuizErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('QuizInterface Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Quiz Loading Error</h2>
            <p className="text-gray-700 mb-4">There was an error loading the quiz interface.</p>
            <button 
              onClick={() => window.location.href = '/student/dashboard'} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            {/* ADD THIS LINE TO FIX THE ERROR */}
            <Route path="/login" element={<AuthPage />} />
            
            {/* Student Routes */}
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/flashcards" element={<FlashcardInterface />} />
            <Route path="/student/tutor" element={<TutorInterface />} />
            <Route path="/student/study-materials" element={<StudyMaterials />} />
            <Route path="/student/progress" element={<StudentProgress />} />
            <Route path="/student/code" element={<CodingPractice />} />
            
            {/* Teacher Routes */}
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/material-upload" element={<MaterialUpload />} />
            
            {/* Quiz Route with Error Boundary */}
            <Route path="/quiz" element={
              <QuizErrorBoundary>
                <QuizInterface />
              </QuizErrorBoundary>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;