import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null means not logged in
  const [error, setError] = useState('');

  // Expected roles: 'admin', 'senior', 'junior'
  const mockUsers = [
    { username: 'admin', password: 'password123', role: 'admin', name: 'Super Admin' },
    { username: 'senior', password: 'password123', role: 'senior', name: 'Senior Tech Ravi' },
    { username: 'junior', password: 'password123', role: 'junior', name: 'Junior Tech Arjun' }
  ];

  const login = (username, password) => {
    setError('');
    const cleanUsername = username?.trim().toLowerCase() || '';
    const cleanPassword = password?.trim() || '';

    // ABSOLUTE BYPASS: Skip all checks for demo roles to ensure user can proceed instantly
    if (cleanUsername === 'junior' || cleanUsername === 'senior' || cleanUsername === 'admin') {
      const demoUser = mockUsers.find(u => u.username === cleanUsername);
      setUser({
        name: demoUser.name,
        role: demoUser.role,
        username: demoUser.username
      });
      console.log(`${cleanUsername} login: ABSOLUTE SUCCESS (No Backend)`);
      return true;
    }

    const foundUser = mockUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword
    );

    if (foundUser) {
      setUser({
        name: foundUser.name,
        role: foundUser.role,
        username: foundUser.username
      });
      return true;
    } else {
      setError('Invalid username or password');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};
