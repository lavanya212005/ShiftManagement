import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('shiftsync_current_user');
    return saved ? JSON.parse(saved) : null;
  }); 
  const [error, setError] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem('shiftsync_users');
    if (saved) return JSON.parse(saved);
    return [
      { username: 'admin', password: 'password123', role: 'admin', name: 'Super Admin', specialization: 'All' },
      { username: 'senior', password: 'password123', role: 'senior', name: 'Senior Tech Ravi', specialization: 'Maintenance' },
      { username: 'junior', password: 'password123', role: 'junior', name: 'Junior Tech Arjun', specialization: 'Mechanical' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('shiftsync_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('shiftsync_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('shiftsync_current_user');
    }
  }, [user]);

  const login = (username, password) => {
    setError('');
    const cleanUsername = username?.trim().toLowerCase() || '';
    const cleanPassword = password?.trim() || '';

    // ABSOLUTE BYPASS for demo roles
    if (cleanUsername === 'junior' || cleanUsername === 'senior' || cleanUsername === 'admin') {
      const demoUser = registeredUsers.find(u => u.username === cleanUsername);
      if (demoUser) {
        setUser({
          name: demoUser.name,
          role: demoUser.role,
          username: demoUser.username,
          specialization: demoUser.specialization
        });
        return true;
      }
    }

    const foundUser = registeredUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword
    );

    if (foundUser) {
      setUser({
        name: foundUser.name,
        role: foundUser.role,
        username: foundUser.username,
        specialization: foundUser.specialization
      });
      return true;
    } else {
      setError('Invalid username or password');
      return false;
    }
  };

  const register = (userData) => {
    const exists = registeredUsers.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (exists) {
      setError('Username already exists');
      return false;
    }

    const newUser = {
      ...userData,
      username: userData.username.toLowerCase()
    };

    setRegisteredUsers(prev => [...prev, newUser]);
    setUser({
      name: newUser.name,
      role: newUser.role,
      username: newUser.username,
      specialization: newUser.specialization
    });
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
};
