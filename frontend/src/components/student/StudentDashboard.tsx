import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const features = [
  {
    title: 'Take Quiz',
    description: 'Upload PDFs to create custom quizzes automatically.',
    link: '/quiz',
    icon: '📄',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    title: 'Study Materials',
    description: 'Browse AI-processed content from your uploaded materials.',
    link: '/student/study-materials',
    icon: '📘',
    color: 'bg-indigo-100 text-indigo-800',
  },
  {
    title: 'Flashcards',
    description: 'Practice using AI-generated flashcards.',
    link: '/student/flashcards',
    icon: '📝',
    color: 'bg-green-100 text-green-800',
  },
  {
    title: 'AI Tutor',
    description: 'Get personalized feedback and explanations.',
    link: '/student/tutor',
    icon: '🤖',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    title: 'Progress Tracking',
    description: 'Analyze your learning metrics and performance.',
    link: '/student/progress',
    icon: '📈',
    color: 'bg-red-100 text-red-800',
  },
  {
    title: 'Coding Practice',
    description: 'Refine your coding skills.',
    link: '/student/code',
    icon: '📚',
    color: 'bg-purple-100 text-purple-800',
  },
];

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/auth');
  };

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/auth');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="flex justify-between items-center p-4 md:p-8 flex-shrink-0">
          <div className="w-24"></div>
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">🎓 Student Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back! Ready to continue learning?</p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Logout
          </Button>
        </header>

        {/* Features Grid - Centered both horizontally and vertically */}
        <main className="flex flex-grow items-center justify-center">
          <div className="max-w-7xl mx-auto">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Link 
                  to={feature.link} 
                  key={feature.title}
                  className="block group"
                >
                  <Card className="h-full w-full max-w-sm bg-white shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className={`${feature.color} p-5`}>
                        <span className="text-3xl">{feature.icon}</span>
                      </div>
                      <div className="p-5">
                        <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                          {feature.title}
                        </h2>
                        <p className="text-gray-600 mt-2 text-sm">{feature.description}</p>
                        <Button 
                          variant="link" 
                          className="p-0 mt-4 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Explore →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;