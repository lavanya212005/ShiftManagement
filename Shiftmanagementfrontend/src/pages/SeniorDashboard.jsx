import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import './SeniorDashboard.css';

const SeniorDashboard = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setTranscription('');
      // Simulate transcription progress
      setTimeout(() => {
        if (isRecording) return; // if it was turned off quickly
        setTranscription("The CNC machine vibrates at 4000 RPM, I tightened the B-valve to fix it.");
      }, 3000);
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Voice-First Floor Capture</h2>
        <p>Log your shift insights using voice to train the ShiftSync Knowledge Graph.</p>
      </div>

      <div className="dashboard-grid">
        <Card className="record-card">
          <div className="record-area">
            <button 
              className={`record-btn ${isRecording ? 'recording pulse-anim' : ''}`}
              onClick={toggleRecording}
            >
              <div className="mic-icon">🎙️</div>
            </button>
            <h3>{isRecording ? 'Recording...' : 'Tap to Record Insight'}</h3>
            <p className="record-hint">"E.g., The CNC machine vibrates at 4000 RPM..."</p>
          </div>
          
          {transcription && (
            <div className="transcription-area animate-fade-in">
              <h4>Extracted Insight</h4>
              <div className="transcription-box">
                <p>"{transcription}"</p>
              </div>
              <div className="insight-tags">
                <span className="tag problem">Problem: CNC Vibration</span>
                <span className="tag solution">Fix: Tightened B-valve</span>
              </div>
              <Button variant="primary" style={{ width: '100%', marginTop: '1rem' }}>
                Save to Knowledge Graph
              </Button>
            </div>
          )}
        </Card>

        <Card title="Recent Logs" className="logs-card">
          <ul className="logs-list">
            <li className="log-item">
              <div className="log-time">Today, 10:30 AM</div>
              <div className="log-content">Calibrated the pressure sensor on Boiler #2.</div>
              <div className="log-status success">Indexed</div>
            </li>
            <li className="log-item">
              <div className="log-time">Yesterday, 4:15 PM</div>
              <div className="log-content">Replaced the cooling fluid pump for Assembly Line B.</div>
              <div className="log-status success">Indexed</div>
            </li>
            <li className="log-item">
              <div className="log-time">Yesterday, 9:00 AM</div>
              <div className="log-content">Addressed misalignment in the robotic arm joint.</div>
              <div className="log-status success">Indexed</div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default SeniorDashboard;
