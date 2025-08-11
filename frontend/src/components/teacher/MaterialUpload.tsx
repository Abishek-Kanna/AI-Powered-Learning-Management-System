import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const MaterialUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const subjects = [
    { value: '', label: '-- Select Subject --' },
    { value: 'mixed', label: '📚 Mixed Materials' },
    { value: 'python', label: '🐍 Python' },
    { value: 'java', label: '☕ Java' },
    { value: 'cpp', label: '➕ C++' },
    { value: 'c', label: '🇨 C' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setStatusMessage('Please select a valid PDF file.');
        setIsSuccess(false);
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setStatusMessage('File size must be less than 10MB.');
        setIsSuccess(false);
        return;
      }
      setSelectedFile(file);
      setStatusMessage('');
    }
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubject(e.target.value);
    setStatusMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile || !subject) {
      setStatusMessage('Please select both a subject and a PDF file.');
      setIsSuccess(false);
      return;
    }

    const formData = new FormData();
    formData.append('pdf', selectedFile);
    formData.append('subject', subject);

    setLoading(true);
    setStatusMessage('');
    setIsSuccess(false);

    try {
      // Get token from localStorage for authenticated request
      const token = localStorage.getItem('token');
      
      const response = await axios.post('http://localhost:3001/api/files/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` // Add this for protected routes
        },
      });

      setStatusMessage(response.data.message);
      setIsSuccess(true);
      resetForm();

    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error?.response?.data?.error || 'Upload failed. Please try again.';
      setStatusMessage(`❌ ${errorMessage}`);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSubject('');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Upload Learning Material</h1>
          <p className="text-gray-600">Upload PDF files to automatically generate quizzes and flashcards.</p>
        </div>
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                1. Select Subject Category
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500"
                value={subject}
                onChange={handleSubjectChange}
                disabled={loading}
              >
                {subjects.map((subj) => (
                  <option key={subj.value} value={subj.value}>{subj.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                2. Choose PDF File
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={loading}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleUpload}
              disabled={loading || !selectedFile || !subject}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <Upload className="h-5 w-5 mr-2" />
              )}
              {loading ? 'Uploading...' : 'Upload & Process File'}
            </Button>
            {statusMessage && (
              <div className={`mt-6 p-4 rounded-lg border text-center ${
                isSuccess 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {isSuccess ? <CheckCircle2 className="inline-block w-5 h-5 mr-2" /> : <XCircle className="inline-block w-5 h-5 mr-2" />}
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default MaterialUpload;