import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import './JuniorDashboard.css';

const JuniorDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [chatResult, setChatResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e, queryOverride = null) => {
    if (e) e.preventDefault();
    const query = queryOverride || searchQuery;
    
    if (query.trim().length === 0) return;
    
    setLoading(true);
    setShowResult(false);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:5000/api/junior/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: query })
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        setChatResult(result.data);
        setShowResult(true);
      } else {
        setError(result.message || 'Failed to get an answer.');
      }
    } catch (err) {
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (query) => {
    setSearchQuery(query);
    handleSearch(null, query);
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
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search Knowledge Graph'}
          </Button>
        </form>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>

      {showResult && chatResult && (
        <div className="results-section animate-fade-in">
          <Card title="Agent Found a Match!" className="result-card">
            <div className="match-header">
              <div className="match-confidence">
                Method: {chatResult.source?.method || "AI Search"}
              </div>
              <div className="match-author">
                Confidence: {chatResult.source?.confidence || "N/A"}
              </div>
            </div>

            <div className="solution-details" style={{ marginTop: '20px' }}>
              <h4>Answer / Solution</h4>
              <p className="quote">"{chatResult.answer}"</p>
            </div>
          </Card>
        </div>
      )}

      {!showResult && !loading && (
        <div className="suggested-queries">
          <h3>Common Problems Today</h3>
          <div className="queries-grid">
            <div className="query-chip" onClick={() => handleChipClick("Boiler pressure dropping")}>
              Boiler pressure dropping
            </div>
            <div className="query-chip" onClick={() => handleChipClick("Robotic arm misalignment")}>
              Robotic arm misalignment
            </div>
            <div className="query-chip" onClick={() => handleChipClick("Cooling fluid leak Assembly B")}>
              Cooling fluid leak Assembly B
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JuniorDashboard;
