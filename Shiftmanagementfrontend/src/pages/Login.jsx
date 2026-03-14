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
      const rolePath = `/${user.role}`;
      console.log(`User logged in as ${user.role}, redirecting...`, rolePath);
      navigate(rolePath);
      
      // Final fallback: If react-router navigate fails, use direct browser location change
      setTimeout(() => {
        if (!window.location.pathname.startsWith(rolePath)) {
          console.warn('Navigation failed, forcing hard redirect to:', rolePath);
          window.location.href = rolePath;
        }
      }, 600);
    }
  }, [user, navigate]);

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
    login(u, p);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-header">
        <h1>ShiftSync <span>Agent</span></h1>
        <p>The "Tribal Knowledge" Transfer Platform for MSMEs</p>
        <div style={{color: '#22c55e', fontSize: '0.8rem', marginTop: '10px', fontWeight: 'bold'}}>
          ✓ Master Login System (Mock Enabled)
        </div>
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
            <h4>Quick Access Portals</h4>
            <div className="demo-chips">
              <div className="demo-chip" style={{background: '#9333ea', color: 'white', borderColor: '#a855f7'}} onClick={() => handleQuickLogin('admin', 'password123')}>
                <strong>Admin</strong>
              </div>
              <div className="demo-chip" style={{background: '#ea580c', color: 'white', borderColor: '#f97316'}} onClick={() => handleQuickLogin('senior', 'password123')}>
                <strong>Senior</strong>
              </div>
              <div className="demo-chip" style={{background: '#2563eb', color: 'white', borderColor: '#3b82f6'}} onClick={() => handleQuickLogin('junior', 'password123')}>
                <strong>Junior</strong>
              </div>
            </div>
            <p className="demo-hint">Click a role above to launch that dashboard</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
