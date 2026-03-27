import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Lazy loading pages will occur soon
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SeniorDashboard from './pages/SeniorDashboard';
import JuniorDashboard from './pages/JuniorDashboard';
import SignUp from './pages/SignUp';

import './App.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  const userRole = user.role?.toLowerCase();
  
  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    // If not allowed, redirect to their primary dashboard
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'senior') return <Navigate to="/senior" replace />;
    if (userRole === 'junior') return <Navigate to="/junior" replace />;
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const { user, loading } = useAuth();
  console.log('[App State] User:', user?.username, '| Loading:', loading);

  return (
    <div className="app-container">
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/senior/*" 
            element={
              <ProtectedRoute allowedRoles={['senior']}>
                <SeniorDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/junior/*" 
            element={
              <ProtectedRoute allowedRoles={['junior']}>
                <JuniorDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
