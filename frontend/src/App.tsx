import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage, { AuthProvider } from './components/auth/auth'; 
import ProtectedRoute from './components/auth/ProtectedRoute';
import StudentDashboard from './components/student/StudentDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import QuizInterface from './components/student/QuizInterface';
import FlashcardInterface from './components/student/FlashcardInterface';
import TutorInterface from './components/student/TutorInterface';
import StudyMaterials from './components/student/StudyMaterials';
import StudentProgress from './components/student/StudentProgress';
import MaterialUpload from './components/teacher/MaterialUpload';
import CodingPractice from './components/student/CodingPractice';

// Error Boundary Component (no changes needed here)
class QuizErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('QuizInterface Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong loading the quiz.</div>;
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
            {/* Public routes */}
            <Route path="/" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            
            {/* Protected routes that require a user to be logged in */}
            <Route element={<ProtectedRoute />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/quiz" element={
                <QuizErrorBoundary>
                  <QuizInterface />
                </QuizErrorBoundary>
              } />
              <Route path="/student/flashcards" element={<FlashcardInterface />} />
              <Route path="/student/tutor" element={<TutorInterface />} />
              <Route path="/student/study-materials" element={<StudyMaterials />} />
              <Route path="/student/progress" element={<StudentProgress />} />
              <Route path="/student/code" element={<CodingPractice />} />
              <Route path="/teacher/material-upload" element={<MaterialUpload />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;