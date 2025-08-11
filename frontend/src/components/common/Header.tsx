import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  const isStudent = location.pathname.startsWith('/student');
  const isTeacher = location.pathname.startsWith('/teacher');

  const studentLinks = [
    { name: 'Dashboard', path: '/student/dashboard' },
    { name: 'Quiz', path: '/student/quiz' },
    { name: 'Flashcards', path: '/student/flashcards' },
    { name: 'Tutor', path: '/student/tutor' },
    { name: 'Progress', path: '/student/progress' },
    { name: 'Study Materials', path: '/student/study' },
  ];

  const teacherLinks = [
    { name: 'Dashboard', path: '/teacher/dashboard' },
    { name: 'Upload', path: '/teacher/upload' },
    { name: 'Students', path: '/teacher/students' },
    { name: 'Analytics', path: '/teacher/analytics' },
    { name: 'Leaderboard', path: '/teacher/leaderboard' },
  ];

  const navLinks = isStudent ? studentLinks : isTeacher ? teacherLinks : [];

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-indigo-600">
          📘 AI Learning System
        </Link>
        <nav className="flex gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium hover:text-indigo-600 transition ${
                location.pathname === link.path ? 'text-indigo-600 underline' : 'text-gray-700'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
