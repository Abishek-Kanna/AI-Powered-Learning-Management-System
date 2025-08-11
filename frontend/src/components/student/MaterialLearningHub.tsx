import React from 'react';
import { Link } from 'react-router-dom';

const MaterialLearningHub: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📚 Material Learning Hub</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link to="/student/flashcards" className="bg-white shadow-md p-4 rounded hover:bg-blue-50">
          <h2 className="text-lg font-semibold">🃏 Flashcards</h2>
          <p className="text-sm text-gray-600">Practice key terms & concepts interactively</p>
        </Link>
        <Link to="/student/quiz" className="bg-white shadow-md p-4 rounded hover:bg-blue-50">
          <h2 className="text-lg font-semibold">📝 Quizzes</h2>
          <p className="text-sm text-gray-600">Test your understanding with AI-generated quizzes</p>
        </Link>
        <Link to="/student/tutor" className="bg-white shadow-md p-4 rounded hover:bg-blue-50">
          <h2 className="text-lg font-semibold">🤖 AI Tutor</h2>
          <p className="text-sm text-gray-600">Get explanations for wrong answers</p>
        </Link>
        <Link to="/student/study-materials" className="bg-white shadow-md p-4 rounded hover:bg-blue-50">
          <h2 className="text-lg font-semibold">📁 Study Materials</h2>
          <p className="text-sm text-gray-600">Access uploaded PDFs and learning resources</p>
        </Link>
      </div>
    </div>
  );
};

export default MaterialLearningHub;
