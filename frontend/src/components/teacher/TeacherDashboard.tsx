import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios'; 


const features = [
  {
    title: 'Upload Materials',
    description: 'Manage and upload PDF content for students.',
    link: '/teacher/material-upload',
    icon: '📤',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    title: 'Analytics Dashboard',
    description: 'Track quiz performance and student progress.',
    link: '/teacher/analytics',
    icon: '📊',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    title: 'Leaderboard',
    description: 'View and manage top performers.',
    link: '/teacher/leaderboard',
    icon: '🏆',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    title: 'Student Management',
    description: 'See student details and manage their access.',
    link: '/teacher/students',
    icon: '🧑‍🎓',
    color: 'bg-green-100 text-green-800',
  },
];

// Define the type for a Material document
interface Material {
  _id: string;
  originalName: string;
  subject: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
}

const TeacherDashboard: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/api/files/materials', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setMaterials(response.data);
      } catch (error) {
        console.error("Failed to fetch materials", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/auth');
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">Completed</span>;
      case 'processing':
        return <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Processing</span>;
      case 'failed':
        return <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-1 rounded-full">Failed</span>;
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">👩‍🏫 Teacher Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your classroom and track student progress</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </header>

        {/* Features Grid - This remains the same */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {features.map((feature) => (
             <Link to={feature.link} key={feature.title} className="block group">
              <Card className="h-full bg-white shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-0">
                  <div className={`${feature.color} p-5`}>
                    <span className="text-3xl">{feature.icon}</span>
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">
                      {feature.title}
                    </h2>
                    <p className="text-gray-600 mt-2 text-sm">{feature.description}</p>
                    <Button variant="link" className="p-0 mt-3 text-blue-600 font-medium">
                      Manage →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Uploaded Materials List */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Uploaded Materials</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading materials...</p>
            ) : (
              <div className="space-y-4">
                {materials.length > 0 ? materials.map((material) => (
                  <div key={material._id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-900">{material.originalName}</p>
                      <p className="text-gray-500 text-sm">Subject: {material.subject}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Uploaded on: {new Date(material.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(material.status)}
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No materials uploaded yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default TeacherDashboard;