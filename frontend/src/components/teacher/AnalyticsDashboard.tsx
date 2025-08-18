import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { StudentDetail } from './StudentDetail';
import { StudentList } from './StudentList';

// --- TypeScript Interfaces ---

// Represents the analytics for a single student
export interface StudentAnalytics {
  userId: string;
  username: string;
  totalQuizzes: number;
  totalFlashcards: number;
  averageScore: number;
  studyTime: number; // in hours
  scoreByCategory: { [category: string]: number };
  recentActivities: Array<{
    type: 'quiz' | 'flashcard';
    name: string;
    score?: number;
    date: string;
  }>;
}

const AnalyticsDashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudentAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        // This new endpoint will return analytics for all students
        const response = await axios.get('http://localhost:3001/api/teacher/all-student-analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(response.data);
        // Automatically select the first student in the list
        if (response.data.length > 0) {
          setSelectedStudent(response.data[0]);
        }
      } catch (err) {
        setError('Failed to fetch student analytics. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAnalytics();
  }, []);

  const handleSelectStudent = (studentId: string) => {
    const student = students.find(s => s.userId === studentId);
    setSelectedStudent(student || null);
  };

  const filteredStudents = students.filter(student =>
    student.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6 text-center">Loading student analytics...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Master View: Student List */}
      <div className="w-1/4 border-r bg-white overflow-y-auto">
        <StudentList
          students={filteredStudents}
          selectedStudentId={selectedStudent?.userId}
          onSelectStudent={handleSelectStudent}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>

      {/* Detail View: Student Analytics */}
      <div className="w-3/4 p-6 overflow-y-auto">
        {selectedStudent ? (
          <StudentDetail student={selectedStudent} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              {students.length > 0 ? 'Select a student to view their analytics.' : 'No student data available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;