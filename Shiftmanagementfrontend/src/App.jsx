import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Lazy loading pages will occur soon
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SeniorDashboard from './pages/SeniorDashboard';
import JuniorDashboard from './pages/JuniorDashboard';

import './App.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not allowed, redirect to their primary dashboard
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'senior') return <Navigate to="/senior" replace />;
    if (user.role === 'junior') return <Navigate to="/junior" replace />;
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Login />} />
          
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
