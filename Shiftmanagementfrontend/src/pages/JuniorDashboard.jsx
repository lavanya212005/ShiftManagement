import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { MdMic, MdMicNone } from 'react-icons/md';
import './JuniorDashboard.css';

const JuniorDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingLog, setMatchingLog] = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (query.length === 0) return;

    setIsSearching(true);
    setMatchingLog(null);
    setSearchMessage('');

    const token = localStorage.getItem('shiftsync_token');
    if (!token) {
      alert('Authentication token missing. Please log in.');
      setIsSearching(false);
      return;
    }

    try {
      const response = await fetch('/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      if (data.match) {
        setMatchingLog(data.match);
        // Important: Still show the safety message from backend if provided
        if (data.message) {
          setSearchMessage(data.message);
        }
      } else {
        setSearchMessage(data.message || "No exact match found. Please contact a senior technician to resolve this issue.");
      }
    } catch (err) {
      console.error('Search Error:', err);
      setSearchMessage("Search Error: " + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      setSearchQuery(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-trigger search after a short delay to let state update
      setTimeout(() => {
        const currentQuery = document.querySelector('.search-input').value;
        if (currentQuery.trim().length > 0) {
          handleSearch();
        }
      }, 500);
    };

    recognition.onerror = (event) => {
      console.error('Speech Recognition Error:', event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Knowledge Retrieval Agent</h2>
        <p>Ask a question or describe an issue to retrieve "Tribal Knowledge" from senior techs.</p>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input 
              type="text" 
              className="premium-input search-input" 
              placeholder="E.g., CNC vibration at 4000 RPM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
            <button 
              type="button" 
              className={`voice-search-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoiceSearch}
              disabled={isSearching}
              title="Voice Search"
            >
              {isListening ? <MdMic className="pulse-icon" /> : <MdMicNone />}
            </button>
          </div>
          <Button type="submit" variant="primary" disabled={isSearching}>
            {isSearching ? '🤖 AI Reasoning...' : 'Search Knowledge Graph'}
          </Button>
        </form>
      </div>

      {searchMessage && (
        <div className="results-section animate-fade-in" style={{ marginBottom: matchingLog ? '1rem' : '0' }}>
          <Card className={`result-card ${!matchingLog ? 'error-card' : 'warning-card'}`} style={{ borderTop: !matchingLog ? '4px solid var(--danger-color)' : '4px solid var(--warning-color)' }}>
            <div className="error-message">
              <span>{matchingLog ? '⚠️' : '🚫'}</span>
              <p><strong>Safety Protocol:</strong> {searchMessage}</p>
            </div>
            {!matchingLog && (
              <Button variant="secondary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => window.location.reload()}>
                Refresh Knowledge Graph
              </Button>
            )}
          </Card>
        </div>
      )}

      {matchingLog && (
        <div className="results-section animate-fade-in">
          <Card title="Agent Found a Match!" className="result-card">
            <div className="match-header">
              <div className="match-confidence">
                {matchingLog.confidence ? `${(matchingLog.confidence * 100).toFixed(0)}% Match` : '98% Match'}
              </div>
              <div className="match-author">Source: {matchingLog.author || 'Senior Tech Ravi'}</div>
            </div>
            
            <div className="voice-note-player">
              <button 
                className="play-btn" 
                onClick={() => {
                  if (matchingLog.audio_url) {
                    new Audio(matchingLog.audio_url).play();
                  } else {
                    alert("No audio recording available for this legacy log.");
                  }
                }}
              >
                {matchingLog.audio_url ? '▶️' : '🔇'}
              </button>
              <div className="waveform">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
              <div className="time">0:00 / 0:15</div>
            </div>

            <div className="solution-details">
              {matchingLog.root_cause && (
                <div className="analysis-block">
                  <h4 style={{ color: 'var(--danger-color)' }}>🛠️ Root Cause Identification</h4>
                  <p className="quote">{matchingLog.root_cause}</p>
                </div>
              )}
              
              {matchingLog.solution && (
                <div className="analysis-block">
                  <h4 style={{ color: 'var(--success-color)' }}>✅ Actionable Solution</h4>
                  <div className="solution-steps" style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--success-color)' }}>
                    {matchingLog.solution}
                  </div>
                </div>
              )}

              {!matchingLog.root_cause && (
                <>
                  <h4>Original Transcription</h4>
                  <p className="quote">"{matchingLog.transcript || matchingLog.content}"</p>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {!matchingLog && (
        <div className="suggested-queries">
          <h3>Common Problems Today</h3>
          <div className="queries-grid">
            <div className="query-chip" onClick={() => { setSearchQuery("Boiler pressure"); setTimeout(() => handleSearch(), 0); }}>
              Boiler pressure
            </div>
            <div className="query-chip" onClick={() => { setSearchQuery("Robotic arm"); setTimeout(() => handleSearch(), 0); }}>
              Robotic arm
            </div>
            <div className="query-chip" onClick={() => { setSearchQuery("Assembly B"); setTimeout(() => handleSearch(), 0); }}>
              Assembly B
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JuniorDashboard;
