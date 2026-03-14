import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import './Login.css';

const Login = () => {
  const { user, login, error } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      if (user.role === 'senior') navigate('/senior');
      if (user.role === 'junior') navigate('/junior');
    }
  }, [user, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-header">
        <h1>ShiftSync <span>Agent</span></h1>
        <p>The "Tribal Knowledge" Transfer Platform for MSMEs</p>
      </div>

      <div className="login-form-wrapper">
        <Card title="Portal Login" className="login-card">
          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label className="input-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="premium-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="premium-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}

            <Button type="submit" variant="primary" className="login-btn">
              Sign In
            </Button>
          </form>

          <div className="demo-credentials">
            <h4>Demo Credentials (Password is 'password123')</h4>
            <ul>
              <li><strong>Admin:</strong> admin</li>
              <li><strong>Senior Tech:</strong> senior</li>
              <li><strong>Junior Tech:</strong> junior</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
