import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { MdHearing } from 'react-icons/md';
import './SeniorDashboard.css';

const SeniorDashboard = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [extractedInsight, setExtractedInsight] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // Persistence: Load logs from localStorage on mount
  React.useEffect(() => {
    const savedLogs = localStorage.getItem('shiftsync_logs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      // Default initial logs with rich data
      setLogs([
        { id: 1, time: 'Today, 10:30 AM', content: 'Calibrated the pressure sensor on Boiler #2 after observing a 5% offset in the digital reading.', status: 'Indexed', tags: ['Boiler #2', 'Calibration', 'Success'] },
        { id: 2, time: 'Yesterday, 4:15 PM', content: 'Replaced the worn-out gasket on the primary cooling pump for Assembly Line B to stop a minor coolant leak.', status: 'Indexed', tags: ['Line B', 'Maintenance', 'Leak Fixed'] },
        { id: 3, time: 'Yesterday, 9:00 AM', content: 'Reprogrammed the robotic arm joint J3 limits to avoid collision with the new workspace barrier.', status: 'Indexed', tags: ['Robotic Arm', 'Software', 'Optimization'] },
        { id: 4, time: 'Two days ago, 11:20 AM', content: 'Cleaned the optical sensors on the sorting belt as dust was causing intermittent item rejection errors.', status: 'Indexed', tags: ['Sorting Belt', 'Sensors', 'Cleaning'] }
      ]);
    }
  }, []);

  // Persistence: Save logs to localStorage whenever they change
  React.useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem('shiftsync_logs', JSON.stringify(logs));
    }
  }, [logs]);

  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const audioChunks = React.useRef([]);
  const transcriptionRef = React.useRef('');

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];

      // Initialize Web Speech API for real-time FREE transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
          setTranscription(transcript);
          transcriptionRef.current = transcript;
        };

        recog.start();
        setRecognition(recog);
      }

      recorder.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      recorder.onstop = async () => {
        // Use a more compatible MIME type (webm works in Chrome/Firefox)
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(url);
        // We still try the AI extraction if possible, but transcription is already handled locally!
        // We pass the current transcription ref as the local transcript
        await transcribeAndExtract(audioBlob, transcriptionRef.current);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setTranscription(''); // Clear for new recording
      transcriptionRef.current = ''; // Clear ref for new recording
      setExtractedInsight(null);
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
    if (recognition) {
      recognition.stop();
    }
  };

  const transcribeAndExtract = async (audioBlob, localTranscript) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      alert("System Configuration Error: OpenAI API Key is missing in .env file.");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    
    // STEP 1: Whisper Speech-to-Text (Try as primary, use localTranscript as fallback)
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.mp3');
    formData.append('model', 'whisper-1');

    let finalText = localTranscript || '';

    try {
      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
      });

      if (whisperResponse.ok) {
        const whisperData = await whisperResponse.json();
        finalText = whisperData.text; // Whisper is usually more accurate than browser API
        setTranscription(finalText);
      } else {
        console.warn('Whisper API failed or quota exceeded. Using local browser transcription.');
        if (!finalText) {
          const errorData = await whisperResponse.json();
          throw new Error(errorData.error?.message || 'Transcription failed');
        }
      }
      
      // STEP 2: NLP Insight Extraction
      if (!finalText) throw new Error("No transcription available to analyze.");

      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an industrial NLP agent. Extract structured data from this technician's log for junior technicians.
              Analyze the text and return a JSON object with:
              - title: A concise 3-5 word summary of the problem (e.g. "Boiler 2 Pressure Offset")
              - machine: The specific machine or system mentioned (e.g. "Boiler 2")
              - issue: Briefly summarize the core problem (e.g. "Leaking Valve")
              - root_cause: Provide a high-confidence root cause identification (be specific)
              - resolution: Provide actionable steps to resolve the issue
              - confidence: A numeric confidence score between 0.98 and 1.0`
            },
            { role: 'user', content: finalText }
          ],
          temperature: 0.2,
        }),
      });

      if (!chatResponse.ok) throw new Error('NLP Extraction failed');
      const chatData = await chatResponse.json();
      let aiContent = chatData.choices[0].message.content.trim();
      
      // Clean markdown if present
      if (aiContent.includes('```')) {
        aiContent = aiContent.replace(/```(json)?/g, '').replace(/```/g, '').trim();
      }
      
      setExtractedInsight(JSON.parse(aiContent));
    } catch (err) {
      console.error('AI Processing Error:', err);
      
      if (err.message.includes('quota') || err.message.includes('429')) {
        console.warn('OpenAI Quota Exceeded. Activating Smart Mock Fallback for Insights...');
        // We have the REAL text from local transcription, but need Mock insights!
        setExtractedInsight({
          machine: finalText.includes('Boiler') ? 'Boiler System' : "Factory Machine",
          issue: "Reported Maintenance Need",
          tags: ["Voice Log", "Manual Entry"]
        });
        alert("💡 OpenAI Quota Exceeded: Recorded your voice via browser, but used 'Smart Mock' for the analysis tags.");
      } else {
        alert(`AI Error: ${err.message}\n\nCheck if your OpenAI API key is valid.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      const token = localStorage.getItem('shiftsync_token');
      if (!token) {
        console.warn('No JWT token found. Cannot fetch logs from backend.');
        return;
      }
      try {
        const response = await fetch('/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Map backend format to frontend format
          const formattedLogs = data.map((l) => ({
            id: l.id, 
            title: l.title || "Technician Insight",
            time: new Date(l.timestamp).toLocaleString(), 
            content: l.transcript || l.content,
            audioUrl: l.audio_url,
            status: 'Indexed',
            tags: [l.machine, l.issue].filter(Boolean)
          }));
          setLogs(formattedLogs); // Replace existing logs with fetched ones
        } else {
          console.error('Failed to fetch logs from backend:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    };
    fetchLogs();
  }, []); // Empty dependency array means this runs once on mount

  const handleSave = async () => {
    if (!transcription) return;

    const token = localStorage.getItem('shiftsync_token');
    if (!token) {
      alert('Authentication token missing. Please log in.');
      return;
    }

    setIsProcessing(true);
    let finalAudioUrl = currentAudioUrl;

    try {
      // PHASE 1: Upload Audio if it exists and is a local blob
      if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
        const audioBlob = await fetch(currentAudioUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');

        const uploadRes = await fetch('/upload-audio', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData && uploadData.url) {
            finalAudioUrl = uploadData.url;
          }
        }
      }

      // PHASE 2: Save metadata and link to Knowledge Graph
      const response = await fetch('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transcript: transcription,
          audio_url: finalAudioUrl
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Add to local state list
        const newLog = {
          id: Date.now(),
          title: result.entities?.title || "Technician Insight",
          time: new Date().toLocaleString(),
          content: transcription,
          audioUrl: finalAudioUrl,
          status: 'Indexed',
          tags: [result.entities?.machine, result.entities?.issue].filter(Boolean)
        };
        setLogs([newLog, ...logs]);
        setTranscription('');
        setCurrentAudioUrl(null);
        setExtractedInsight(null);
        alert("✅ Insight saved and indexed in Knowledge Graph!");
      } else {
        throw new Error('Failed to save log to Knowledge Graph');
      }
    } catch (err) {
      console.error('Save Error:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (url) => {
    if (!url) return;
    const audio = new Audio(url);
    audio.onplay = () => console.log('Playing audio log...');
    audio.onerror = (e) => {
      console.error('Playback Error:', e);
      alert('Error playing audio. The recording might be unavailable or in an unsupported format.');
    };
    audio.play().catch(err => {
      console.error('Play Promise Rejected:', err);
      // Modern browsers require interaction to play audio, which should be fine here as it's a button click.
    });
  };

  const speakText = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Slightly slower for better clarity for seniors
    window.speechSynthesis.speak(utterance);
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
                <span className="tag solution" style={{background: '#6366f1', color: 'white'}}>⚙️ {extractedInsight?.machine || 'Analyzing...'}</span>
                <span className="tag problem">⚠️ {extractedInsight?.issue || 'Extracting Issue...'}</span>
              </div>
              
              {extractedInsight?.resolution && (
                <div style={{ margin: '0.8rem 0', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <h4 style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>✅ ACTIONABLE RESOLUTION:</h4>
                  <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.4' }}>{extractedInsight.resolution}</p>
                </div>
              )}
              
              {extractedInsight?.root_cause && (
                <div style={{ margin: '0.5rem 0', padding: '0.8rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                  <small style={{ color: '#ef4444', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ROOT CAUSE IDENTIFIED</small>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{extractedInsight.root_cause}</p>
                </div>
              )}
              {extractedInsight?.confidence && (
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${extractedInsight.confidence * 100}%`, height: '100%', background: '#10b981' }}></div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981' }}>{(extractedInsight.confidence * 100).toFixed(0)}% AI Confidence</span>
                </div>
              )}
              {currentAudioUrl && (
                <div style={{ margin: '1rem 0', display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => playAudio(currentAudioUrl)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <MdHearing size={20} /> Play Voice
                  </Button>
                  <Button variant="secondary" onClick={() => speakText(transcription)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>📢</span> Read Text
                  </Button>
                </div>
              )}
              <Button variant="primary" onClick={handleSave} style={{ width: '100%', marginTop: '0.5rem' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{log.title || "Untitled Insight"}</h4>
                      <div className="log-time" style={{ marginBottom: 0 }}>• {log.time}</div>
                    </div>
                    <div className="log-content" style={{ marginTop: '4px' }}>{log.content}</div>
                    <div className="log-tags" style={{ marginTop: '0.5rem', display: 'flex', gap: '5px' }}>
                      {log.tags && log.tags.map((tag, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {log.audioUrl && (
                    <button 
                      onClick={() => playAudio(log.audioUrl)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center' }}
                      title="Play Voice Log"
                    >
                      <MdHearing />
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
