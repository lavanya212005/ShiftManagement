import React from 'react';
import Card from '../components/Card';
import './AdminDashboard.css';

const AdminDashboard = () => {
  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Admin Overview</h2>
        <p>Monitor shift metrics and knowledge graph adoption across the facility.</p>
      </div>

      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-value">1,248</div>
          <div className="stat-label">Knowledge Graph Nodes</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">85%</div>
          <div className="stat-label">Resolution Rate via Agent</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">12h</div>
          <div className="stat-label">Downtime Saved (This Week)</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">42</div>
          <div className="stat-label">Active Voice Logs</div>
        </Card>
      </div>

      <div className="dashboard-grid admin-charts">
        <Card title="Knowledge Capture Trend">
          <div className="chart-placeholder">
            <div className="bar-chart">
              <div className="bar" style={{height: '30%'}}></div>
              <div className="bar" style={{height: '50%'}}></div>
              <div className="bar" style={{height: '40%'}}></div>
              <div className="bar" style={{height: '70%'}}></div>
              <div className="bar" style={{height: '80%'}}></div>
              <div className="bar" style={{height: '65%'}}></div>
              <div className="bar" style={{height: '90%'}}></div>
            </div>
            <p className="chart-info">Steady increase in voice logs submitted by Senior Techs over 7 days.</p>
          </div>
        </Card>
        
        <Card title="Top Queried Machines">
          <ul className="machine-list">
            <li>
              <span>CNC Machine Alpha</span>
              <span className="query-count">142 queries</span>
            </li>
            <li>
              <span>Boiler System 2</span>
              <span className="query-count">89 queries</span>
            </li>
            <li>
              <span>Robotic Arm Assembly B</span>
              <span className="query-count">76 queries</span>
            </li>
            <li>
              <span>Conveyor Belt Sensor</span>
              <span className="query-count">45 queries</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
