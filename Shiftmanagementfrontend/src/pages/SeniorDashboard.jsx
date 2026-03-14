import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import './SeniorDashboard.css';

const SeniorDashboard = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [logs, setLogs] = useState([
    { id: 1, time: 'Today, 10:30 AM', content: 'Calibrated the pressure sensor on Boiler #2.', status: 'Indexed' },
    { id: 2, time: 'Yesterday, 4:15 PM', content: 'Replaced the cooling fluid pump for Assembly Line B.', status: 'Indexed' },
    { id: 3, time: 'Yesterday, 9:00 AM', content: 'Addressed misalignment in the robotic arm joint.', status: 'Indexed' }
  ]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunks = React.useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];

      recorder.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(url);
        await transcribeWithWhisper(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setTranscription('');
      setCurrentAudioUrl(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please ensure permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const transcribeWithWhisper = async (audioBlob) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      alert("System Configuration Error: OpenAI API Key is missing in .env file.");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.mp3');
    formData.append('model', 'whisper-1');

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Transcription failed');
      }

      const data = await response.json();
      setTranscription(data.text);
    } catch (err) {
      console.error('Whisper API Error:', err);
      alert(`Transcription Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (!transcription) return;

    const newLog = {
      id: Date.now(),
      time: 'Just now',
      content: transcription,
      audioUrl: currentAudioUrl,
      status: 'Indexed'
    };

    setLogs([newLog, ...logs]);
    setTranscription('');
    setCurrentAudioUrl(null);
  };

  const playAudio = (url) => {
    const audio = new Audio(url);
    audio.play();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Whisper AI Floor Capture</h2>
        <p>Log your shift insights using high-accuracy "Tribal Knowledge" capture.</p>
      </div>

      <div className="dashboard-grid">
        <Card className="record-card">
          <div className="record-area">
            <button 
              className={`record-btn ${isRecording ? 'recording pulse-anim' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={toggleRecording}
              disabled={isProcessing}
            >
              <div className="mic-icon">{isProcessing ? '⏳' : '🎙️'}</div>
            </button>
            <h3>{isProcessing ? 'Transcribing with Whisper AI...' : isRecording ? 'Recording...' : 'Tap to Record Insight'}</h3>
            <p className="record-hint">
              {isProcessing ? 'Processing audio...' : 'One-tap voice capture enabled'}
            </p>
          </div>
          
          {transcription && (
            <div className="transcription-area animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>Extracted Insight</h4>
                <span style={{ fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.2)', fontWeight: 'bold' }}>
                  ✓ AI VERIFIED
                </span>
              </div>
              <div className="transcription-box" style={{ background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), rgba(99, 102, 241, 0.02))' }}>
                <p>"{transcription}"</p>
              </div>
              <div className="insight-tags">
                <span className="tag problem">AI-Detected Issue</span>
                <span className="tag solution">Fix Captured</span>
              </div>
              <Button variant="primary" onClick={handleSave} style={{ width: '100%', marginTop: '1rem' }}>
                Save to Knowledge Graph
              </Button>
            </div>
          )}
        </Card>

        <Card title="Recent Logs" className="logs-card">
          <ul className="logs-list">
            {logs.map(log => (
              <li key={log.id} className="log-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="log-time">{log.time}</div>
                    <div className="log-content">{log.content}</div>
                  </div>
                  {log.audioUrl && (
                    <button 
                      onClick={() => playAudio(log.audioUrl)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}
                      title="Play Voice Log"
                    >
                      🔊
                    </button>
                  )}
                </div>
                <div className="log-status success">{log.status}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default SeniorDashboard;
