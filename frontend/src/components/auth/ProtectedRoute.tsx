import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// This import is crucial. It must point to your single, consolidated auth.tsx file.
import { useAuth } from './auth';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // We show a loading indicator while the AuthProvider is checking for a token in localStorage.
  if (loading) {
    return <div>Loading session...</div>;
  }

  // If there is a user, we render the child component the user was trying to access.
  // The <Outlet /> component from react-router-dom does this automatically.
  if (user) {
    return <Outlet />;
  }

  // If there is no user, we redirect to the login page.
  return <Navigate to="/login" />;
};

export default ProtectedRoute;