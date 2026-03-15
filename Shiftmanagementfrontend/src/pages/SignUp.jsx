import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import './Login.css'; // Reusing Login styles for consistency

const SignUp = () => {
  const { register, error, setError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'junior',
    specialization: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = register(formData);
    if (success) {
      navigate(`/${formData.role}`);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-header">
        <h1>Technician <span>Registration</span></h1>
        <p>Join the ShiftSync Knowledge Network</p>
      </div>

      <div className="login-form-wrapper">
        <Card title="Technician Details" className="login-card">
          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label className="input-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                className="premium-input"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="username">Employee ID / Username</label>
              <input
                id="username"
                type="text"
                className="premium-input"
                placeholder="e.g. TECH_01"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="role">Role</label>
              <select 
                id="role" 
                className="premium-input" 
                style={{ appearance: 'auto' }}
                value={formData.role} 
                onChange={handleChange}
              >
                <option value="junior">Junior Technician</option>
                <option value="senior">Senior Technician</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="specialization">Specialization</label>
              <input
                id="specialization"
                type="text"
                className="premium-input"
                placeholder="e.g. Mechanical, Electrical"
                value={formData.specialization}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="premium-input"
                placeholder="Set a password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            
            {error && <div className="error-message" style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '10px' }}>{error}</div>}

            <Button type="submit" variant="primary" className="login-btn">
              Complete Registration
            </Button>
          </form>

          <p className="demo-hint" style={{ marginTop: '20px' }}>
            Already registered? <Link to="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 'bold' }}>Login here</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
