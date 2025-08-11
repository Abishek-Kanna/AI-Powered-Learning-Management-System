// src/components/student/CodingPractice.tsx
import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useNavigate } from 'react-router-dom';

// Define the structure for our coding practice cards
interface CodingCard {
  title: string;
  description: string;
  icon: string;
  color: string;
}

const CodingPractice = () => {
  const navigate = useNavigate();

  // Define the coding practice cards data
  const codingCards: CodingCard[] = [
    {
      title: 'Python',
      description: 'Practice Python coding problems and challenges',
      icon: '🐍',
      color: 'bg-blue-100'
    },
    {
      title: 'Java',
      description: 'Practice Java coding problems and challenges',
      icon: '☕',
      color: 'bg-red-100'
    },
    {
      title: 'C++',
      description: 'Practice C++ coding problems and challenges',
      icon: '➕',
      color: 'bg-green-100'
    },
    {
      title: 'C',
      description: 'Practice C coding problems and challenges',
      icon: '🇨',
      color: 'bg-yellow-100'
    }
  ];

  // Function to handle coding practice for a language
  const handleStartPractice = (language: string) => {
    // Navigate to coding practice interface for the selected language
    navigate('/coding-practice/problems', { state: { language: language } });
  };

  // Function to handle back navigation
  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2 bg-white hover:bg-gray-50"
        >
          <span className="text-lg">‹</span>
          Back
        </Button>
      </div>

      {/* Main Content - Centered */}
      <div className="min-h-screen flex justify-center items-center">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Coding Practice</h1>
            <p className="text-gray-600 mb-8">Choose a programming language to start practicing coding problems</p>

            {/* Coding Practice Cards Grid - Centered */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {codingCards.map((card, index) => (
                <Card 
                  key={index} 
                  className="hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
                >
                  <CardContent className="p-0">
                    <div className={`${card.color} p-6 text-center`}>
                      <span className="text-4xl">{card.icon}</span>
                    </div>
                    <div className="p-6">
                      <h2 className="text-xl font-semibold text-gray-800 mb-2">{card.title}</h2>
                      <p className="text-gray-600 text-sm mb-4">{card.description}</p>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleStartPractice(card.title)}
                      >
                        Start Practice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingPractice;
