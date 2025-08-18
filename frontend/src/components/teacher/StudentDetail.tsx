import React from 'react';
import { StudentAnalytics } from './AnalyticsDashboard';
import { AnalyticsCard } from './AnalyticsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StudentDetailProps {
  student: StudentAnalytics;
}

export const StudentDetail: React.FC<StudentDetailProps> = ({ student }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{student.username}'s Analytics</h1>
      <p className="text-gray-500 mb-6">ID: {student.userId}</p>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnalyticsCard title="Average Score" value={`${student.averageScore.toFixed(1)}%`} />
        <AnalyticsCard title="Quizzes Completed" value={student.totalQuizzes.toString()} />
        <AnalyticsCard title="Flashcards Reviewed" value={student.totalFlashcards.toString()} />
        <AnalyticsCard title="Total Study Time" value={`${student.studyTime.toFixed(1)} hrs`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Scores by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder for the bar chart */}
            <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500">Bar Chart Placeholder</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {student.recentActivities.slice(0, 5).map((activity, index) => (
                <li key={index} className="text-sm border-b pb-2 last:border-0">
                  <span className="font-medium">{activity.name}</span>
                  <span className="text-gray-600"> ({activity.type})</span>
                  {activity.score && <span className="text-blue-600 font-bold ml-2">{activity.score}%</span>}
                  <div className="text-xs text-gray-400 mt-1">{new Date(activity.date).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};