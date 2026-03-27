import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const API_BASE_URL = 'http://127.0.0.1:8000'; // FastAPI backend

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Session restoration disabled to always start from login
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setError('');
    setLoading(true);
    console.log('Login attempt for:', username);
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await fetch('/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      console.log('Backend response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('shiftsync_token', data.access_token);
        
        // Fetch user data
        const userResponse = await fetch('/users/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Normalize role for routing
          userData.role = userData.role?.toLowerCase() || 'junior';
          console.log('User profile loaded:', userData.role);
          setUser(userData);
          return true;
        } else {
          setError('Failed to retrieve user profile.');
          return false;
        }
      } else {
        const errData = await response.json();
        console.error('Login failed:', errData);
        setError(errData.detail || 'Invalid username or password');
        return false;
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Connection refused. Is the backend running?');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setError('');
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        return true;
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Registration failed');
        return false;
      }
    } catch (err) {
      setError('Connection refused. Is the backend running?');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('shiftsync_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, error, setError, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
