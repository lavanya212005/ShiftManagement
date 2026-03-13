import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import './JuniorDashboard.css';

const JuniorDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResult, setShowResult] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      setShowResult(true);
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Knowledge Retrieval Agent</h2>
        <p>Ask a question or describe an issue to retrieve "Tribal Knowledge" from senior techs.</p>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input 
            type="text" 
            className="premium-input search-input" 
            placeholder="E.g., CNC vibration at 4000 RPM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" variant="primary">Search Knowledge Graph</Button>
        </form>
      </div>

      {showResult && (
        <div className="results-section animate-fade-in">
          <Card title="Agent Found a Match!" className="result-card">
            <div className="match-header">
              <div className="match-confidence">98% Match</div>
              <div className="match-author">Source: Senior Tech Ravi</div>
            </div>
            
            <div className="voice-note-player">
              <div className="play-btn">▶️</div>
              <div className="waveform">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
              <div className="time">0:00 / 0:15</div>
            </div>

            <div className="solution-details">
              <h4>Transcription</h4>
              <p className="quote">"The CNC machine vibrates at 4000 RPM, I tightened the B-valve to fix it."</p>
              
              <div className="ar-guide-preview">
                <div className="ar-image-placeholder">
                  [ AR Guide Preview: Highlighting B-Valve on CNC Machine ]
                </div>
                <Button variant="secondary" className="ar-btn">Launch AR Overlay Guide</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!showResult && (
        <div className="suggested-queries">
          <h3>Common Problems Today</h3>
          <div className="queries-grid">
            <div className="query-chip" onClick={() => { setSearchQuery("Boiler pressure dropping"); setShowResult(true); }}>
              Boiler pressure dropping
            </div>
            <div className="query-chip" onClick={() => { setSearchQuery("Robotic arm misalignment"); setShowResult(true); }}>
              Robotic arm misalignment
            </div>
            <div className="query-chip" onClick={() => { setSearchQuery("Cooling fluid leak Assembly B"); setShowResult(true); }}>
              Cooling fluid leak Assembly B
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JuniorDashboard;
