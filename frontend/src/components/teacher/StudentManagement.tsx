import React, { useEffect, useState } from "react";

interface Student {
  id: string;
  name: string;
  email: string;
  progress?: number;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("http://localhost:8000/teacher/students");
        const data = await res.json();
        if (res.ok) {
          setStudents(data);
        } else {
          setError(data.error || "Failed to fetch students.");
        }
      } catch (err) {
        console.error(err);
        setError("Server error while fetching students.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleRemove = async (studentId: string) => {
    const confirm = window.confirm("Are you sure you want to remove this student?");
    if (!confirm) return;

    try {
      const res = await fetch(`http://localhost:8000/teacher/students/${studentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove student.");
      }
    } catch (err) {
      alert("Server error while removing student.");
    }
  };

  if (loading) return <div className="p-6">Loading students...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">👥 Student Management</h1>
      {students.length === 0 ? (
        <p>No students registered yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Progress</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b">
                <td className="p-2">{student.name}</td>
                <td className="p-2">{student.email}</td>
                <td className="p-2">
                  {student.progress !== undefined ? `${student.progress}%` : "N/A"}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => handleRemove(student.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentManagement;
