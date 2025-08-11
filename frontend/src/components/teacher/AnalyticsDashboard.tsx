import React, { useEffect, useState } from "react";

interface AnalyticsData {
  totalMaterials: number;
  totalQuizzes: number;
  totalStudents: number;
  avgScore: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Replace with your backend API endpoint
    fetch("http://localhost:8000/teacher/analytics")
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch analytics:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">Loading analytics...</div>;

  if (!analytics) return <div className="p-6 text-red-600">Failed to load data.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Teacher Analytics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded p-4">
          <h2 className="text-xl font-semibold">📚 Total Materials Uploaded</h2>
          <p className="text-3xl mt-2">{analytics.totalMaterials}</p>
        </div>
        <div className="bg-white shadow-md rounded p-4">
          <h2 className="text-xl font-semibold">📝 Total Quizzes Generated</h2>
          <p className="text-3xl mt-2">{analytics.totalQuizzes}</p>
        </div>
        <div className="bg-white shadow-md rounded p-4">
          <h2 className="text-xl font-semibold">👨‍🎓 Students Enrolled</h2>
          <p className="text-3xl mt-2">{analytics.totalStudents}</p>
        </div>
        <div className="bg-white shadow-md rounded p-4">
          <h2 className="text-xl font-semibold">📈 Average Score</h2>
          <p className="text-3xl mt-2">{analytics.avgScore.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
