import React from 'react';
import { StudentAnalytics } from './AnalyticsDashboard';
import { Input } from '@/components/ui/input';

interface StudentListProps {
  students: StudentAnalytics[];
  selectedStudentId?: string;
  onSelectStudent: (studentId: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Students</h2>
      <Input
        type="text"
        placeholder="Search students..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      <ul className="space-y-2">
        {students.map(student => (
          <li
            key={student.userId}
            onClick={() => onSelectStudent(student.userId)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedStudentId === student.userId
                ? 'bg-blue-100 text-blue-800'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="font-semibold">{student.username}</div>
            <div className="text-xs text-gray-500 mt-1">ID: {student.userId}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};