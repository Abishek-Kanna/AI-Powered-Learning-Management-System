import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useNavigate } from 'react-router-dom';

interface StudyMaterialCard {
  title: string;
  description: string;
  icon: string;
  color: string;
  folder: string;
}

interface PDFFile {
  name: string;
  path: string;
  uploadDate?: string;
}

const StudyMaterials = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studyMaterialCards: StudyMaterialCard[] = [
    {
      title: 'Python',
      description: 'Study materials for Python programming',
      icon: '🐍',
      color: 'bg-blue-100',
      folder: 'python'
    },
    {
      title: 'Java',
      description: 'Study materials for Java programming',
      icon: '☕',
      color: 'bg-red-100',
      folder: 'java'
    },
    {
      title: 'C++',
      description: 'Study materials for C++ programming',
      icon: '➕',
      color: 'bg-green-100',
      folder: 'cpp'
    },
    {
      title: 'C',
      description: 'Study materials for C programming',
      icon: '🇨',
      color: 'bg-yellow-100',
      folder: 'c'
    },
    {
      title: 'Mixed Materials',
      description: 'Various study materials and resources',
      icon: '📚',
      color: 'bg-purple-100',
      folder: 'mixed'
    }
  ];

  const fetchPDFs = async (folder: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/student/materials/${folder}`);
      if (!response.ok) {
        throw new Error('Failed to fetch study materials');
      }
      const data = await response.json();
      setPdfFiles(data.files || []);
    } catch (err) {
      setError('Failed to load study materials');
      console.error('Error fetching PDFs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMaterials = (card: StudyMaterialCard) => {
    setSelectedCategory(card.title);
    fetchPDFs(card.folder);
  };

  const handlePDFAction = (pdf: PDFFile, action: 'view' | 'download') => {
    const subject = studyMaterialCards.find(c => c.title === selectedCategory)?.folder;
    const url = `http://localhost:3001/api/student/materials/file/${subject}/${encodeURIComponent(pdf.path)}`;
    
    if (action === 'view') {
      window.open(url, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = pdf.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
      setPdfFiles([]);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="min-h-screen flex justify-center items-center">
        <div className="container mx-auto px-4">
          {!selectedCategory ? (
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Study Materials</h1>
              <p className="text-gray-600 mb-8">Browse your uploaded study materials by category</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {studyMaterialCards.map((card, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
                    onClick={() => handleViewMaterials(card)}
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
                        >
                          View Materials
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {selectedCategory} Study Materials
              </h1>
              <p className="text-gray-600 mb-8">Available PDF materials for {selectedCategory}</p>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="ml-4 text-gray-600">Loading materials...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={() => fetchPDFs(studyMaterialCards.find(c => c.title === selectedCategory)?.folder || '')}>
                    Try Again
                  </Button>
                </div>
              ) : pdfFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <p className="text-gray-600 text-lg">No materials found in this category</p>
                  <p className="text-gray-500 text-sm mt-2">Upload some PDFs to get started</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pdfFiles.map((pdf, index) => (
                    <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-red-500 text-2xl">📄</div>
                            <div className="text-left">
                              <h3 className="font-semibold text-gray-800">{pdf.name}</h3>
                              {pdf.uploadDate && (
                                <p className="text-sm text-gray-500">
                                  Uploaded: {new Date(pdf.uploadDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePDFAction(pdf, 'view')}
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePDFAction(pdf, 'download')}
                            >
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyMaterials;