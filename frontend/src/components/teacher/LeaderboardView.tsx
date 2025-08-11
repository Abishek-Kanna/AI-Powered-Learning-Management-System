import React, { useEffect, useState } from "react";

interface LeaderboardEntry {
  studentName: string;
  score: number;
  quizzesTaken: number;
}

const LeaderboardView: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Replace with your backend API endpoint
    fetch("http://localhost:8000/teacher/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching leaderboard:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">Loading leaderboard...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🏆 Student Leaderboard</h1>
      <table className="w-full text-left border border-gray-300 rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Student Name</th>
            <th className="p-3">Quizzes Taken</th>
            <th className="p-3">Average Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={index} className="border-t">
              <td className="p-3 font-medium">{index + 1}</td>
              <td className="p-3">{entry.studentName}</td>
              <td className="p-3">{entry.quizzesTaken}</td>
              <td className="p-3">{entry.score.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardView;
