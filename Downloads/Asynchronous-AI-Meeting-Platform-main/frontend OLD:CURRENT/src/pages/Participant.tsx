import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface ConversationTurn {
  id: string;
  speaker: string;
  message: string;
  createdAt: string;
}

interface Whiteboard {
  keyFacts: string[];
  decisions: string[];
  actionItems: string[];
}

export function Participant() {
  const [token, setToken] = useState<string>('');
  const [details, setDetails] = useState<{ subject: string; details: string; id: string } | null>(null);
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [whiteboard, setWhiteboard] = useState<Whiteboard>({ keyFacts: [], decisions: [], actionItems: [] });
  const [meetingStatus, setMeetingStatus] = useState<string>('');
  const [participantMessage, setParticipantMessage] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('token') || '';
    console.log('[Participant] Extracted token:', t);
    setToken(t);
    if (t) {
      load(t);
    } else {
      setError('No invitation token found in URL');
      setLoading(false);
    }
  }, []);

  // Poll for conversation updates after submission
  useEffect(() => {
    if (!submitted || !details?.id) return;
    
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/meetings/${details.id}/status`);
        setMeetingStatus(data.status);
        setConversation(data.history || []);
        setWhiteboard(data.whiteboard || { keyFacts: [], decisions: [], actionItems: [] });
      } catch (err) {
        console.error('[Participant] Error fetching status:', err);
      }
    }, 2000); // Poll every 2 seconds
    
    return () => clearInterval(interval);
  }, [submitted, details?.id]);

  async function load(t: string) {
    try {
      setLoading(true);
      setError('');
      console.log('[Participant] Fetching participant data...');
      const { data } = await axios.get('/api/participant', { params: { token: t } });
      console.log('[Participant] Received data:', data);
      setDetails({ subject: data.subject, details: data.details, id: data.meetingId });
      setParticipantEmail(data.email || 'Participant');
      if (data.hasSubmitted) setSubmitted(true);
    } catch (err: any) {
      console.error('[Participant] Error loading:', err);
      setError(err.response?.data?.error || 'Failed to load invitation. Please check your link.');
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    try {
      await axios.post('/api/participant/submit', { token, content, name: name.trim() || undefined });
      setSubmitted(true);
      // Update participantEmail with the submitted name so injection works correctly
      if (name.trim()) {
        setParticipantEmail(name.trim());
      }
    } catch (err: any) {
      console.error('[Participant] Error submitting:', err);
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    }
  }

  async function injectMessage() {
    if (!details?.id || !participantMessage.trim()) return;
    try {
      await axios.post(`/api/meetings/${details.id}/inject`, {
        author: participantEmail,
        message: participantMessage
      });
      setParticipantMessage(''); // Clear input after sending
    } catch (err) {
      console.error('Failed to inject message:', err);
      alert('Failed to send message');
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <div style={{ color: 'red', padding: 20 }}><p>Error: {error}</p></div>;
  if (!details) return <p>No meeting details available</p>;

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{details.subject}</h3>
        {participantEmail && (
          <div style={{ 
            padding: '6px 12px', 
            background: '#e3f2fd', 
            borderRadius: 16, 
            fontSize: 14,
            fontWeight: 'bold',
            color: '#1565c0'
          }}>
            👤 {participantEmail}
          </div>
        )}
      </div>
      <p>{details.details}</p>
      {submitted ? (
        <div>
          <div style={{ padding: 12, background: '#e8f5e9', borderRadius: 4, marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }}>✅ Your input has been submitted!</p>
            <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
              {meetingStatus === 'completed' ? 'Meeting has concluded. See the final results below.' : 'The AI meeting is in progress. Watch the conversation unfold below.'}
            </p>
          </div>

          {/* Meeting Status */}
          <div style={{ marginBottom: 16 }}>
            <strong>Meeting Status:</strong>{' '}
            <span style={{ 
              color: meetingStatus === 'completed' ? '#2e7d32' : meetingStatus === 'running' ? '#1976d2' : meetingStatus === 'paused' ? '#ff9800' : '#666',
              fontWeight: 'bold'
            }}>
              {meetingStatus === 'completed' ? '✓ Completed' : meetingStatus === 'running' ? '▶ In Progress' : meetingStatus === 'paused' ? '⏸ Paused - Input Needed' : meetingStatus || 'Pending'}
            </span>
          </div>

          {/* Paused Meeting Alert */}
          {meetingStatus === 'paused' && (
            <div style={{ 
              marginTop: 16, 
              marginBottom: 16,
              padding: 16, 
              background: '#fff3e0', 
              border: '3px solid #ff9800', 
              borderRadius: 8
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#e65100' }}>
                🛑 Your Input is Requested
              </h4>
              <p style={{ margin: '8px 0', fontSize: 14, fontWeight: 'bold' }}>
                The AI conversation has reached a crossroads and needs human guidance.
              </p>
              <p style={{ margin: '8px 0', fontSize: 14, color: '#666' }}>
                Please review the discussion and use the "Add Your Voice" box below to provide your perspective or guidance.
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: 13, fontStyle: 'italic', color: '#f57c00' }}>
                💡 The meeting will automatically resume after you send a message.
              </p>
            </div>
          )}

          {/* Participant Interjection Box */}
          {(meetingStatus === 'running' || meetingStatus === 'paused') && (
            <div style={{ 
              padding: 12, 
              background: meetingStatus === 'paused' ? '#fff3e0' : '#e3f2fd', 
              border: meetingStatus === 'paused' ? '2px solid #ff9800' : '2px solid #2196f3', 
              borderRadius: 8, 
              marginBottom: 16 
            }}>
              <h4 style={{ marginTop: 0, color: meetingStatus === 'paused' ? '#f57c00' : '#1976d2' }}>
                💬 {meetingStatus === 'paused' ? 'Provide Your Input' : 'Speak Through Your Persona'}
              </h4>
              <p style={{ fontSize: 13, marginBottom: 8, color: '#666' }}>
                {meetingStatus === 'paused' 
                  ? 'Your input is needed to continue the conversation. Your message will appear as your AI persona speaking.' 
                  : 'You can take direct control of your AI persona at any time. Your message will appear as them speaking in the conversation.'}
              </p>
              <textarea
                rows={3}
                placeholder={meetingStatus === 'paused' ? 'Your guidance is needed - share your thoughts...' : 'Speak as your persona...'}
                value={participantMessage}
                onChange={(e) => setParticipantMessage(e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', fontSize: 14 }}
              />
              <button 
                onClick={injectMessage}
                disabled={!participantMessage.trim()}
                style={{ 
                  marginTop: 8, 
                  backgroundColor: '#2196f3', 
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 4,
                  cursor: participantMessage.trim() ? 'pointer' : 'not-allowed',
                  opacity: participantMessage.trim() ? 1 : 0.5
                }}
              >
                📤 Send Message
              </button>
            </div>
          )}

          {/* Whiteboard Display */}
          {(whiteboard.keyFacts.length > 0 || whiteboard.decisions.length > 0 || whiteboard.actionItems.length > 0) && (
            <div style={{ border: '2px solid #4caf50', padding: 16, borderRadius: 8, marginBottom: 16, background: '#f1f8f4' }}>
              <h4 style={{ marginTop: 0 }}>📊 Whiteboard</h4>
              
              {whiteboard.keyFacts.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: '#2196f3' }}>💡 Key Facts:</strong>
                  <ul style={{ marginTop: 4, marginBottom: 0 }}>
                    {whiteboard.keyFacts.map((fact, i) => (
                      <li key={i}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {whiteboard.decisions.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: '#ff9800' }}>✅ Decisions:</strong>
                  <ul style={{ marginTop: 4, marginBottom: 0 }}>
                    {whiteboard.decisions.map((decision, i) => (
                      <li key={i}><strong>{decision}</strong></li>
                    ))}
                  </ul>
                </div>
              )}
              
              {whiteboard.actionItems.length > 0 && (
                <div>
                  <strong style={{ color: '#9c27b0' }}>🎯 Action Items:</strong>
                  <ul style={{ marginTop: 4, marginBottom: 0 }}>
                    {whiteboard.actionItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Conversation Display */}
          {conversation.length > 0 && (
            <div style={{ marginTop: 24, padding: 12, background: '#f9f9f9', borderRadius: 4, maxHeight: 500, overflowY: 'auto' }}>
              <h4>Conversation ({conversation.length} turns)</h4>
              {conversation.map((turn, i) => {
                const isAI = turn.speaker.startsWith('AI:');
                const isModerator = turn.speaker.includes('Moderator');
                const isHuman = turn.speaker.startsWith('Human:');
                
                // Color scheme for different speaker types
                let bgColor, borderColor, speakerColor, emoji;
                if (isModerator) {
                  bgColor = '#f3e5f5';  // Light purple for moderator
                  borderColor = '#9c27b0';  // Purple
                  speakerColor = '#7b1fa2';  // Dark purple
                  emoji = '👔';
                } else if (isAI) {
                  bgColor = '#e1f5fe';  // Light cyan for AI participants
                  borderColor = '#00bcd4';  // Cyan
                  speakerColor = '#0097a7';  // Dark cyan
                  emoji = '🤖';
                } else if (isHuman) {
                  bgColor = '#fff3e0';  // Light orange for human participants
                  borderColor = '#ff9800';  // Orange
                  speakerColor = '#f57c00';  // Dark orange
                  emoji = '👤';
                } else {
                  bgColor = '#fff3e0';
                  borderColor = '#ff9800';
                  speakerColor = '#f57c00';
                  emoji = '👤';
                }
                
                return (
                  <div key={turn.id} style={{ 
                    marginBottom: 12, 
                    padding: 10, 
                    background: bgColor,
                    borderLeft: `4px solid ${borderColor}`,
                    borderRadius: 4,
                    boxShadow: isAI ? '0 2px 4px rgba(0,188,212,0.1)' : isHuman ? '0 2px 4px rgba(255,152,0,0.15)' : 'none'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', color: speakerColor, marginBottom: 4 }}>
                      {emoji} Turn {i + 1} - {turn.speaker}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: '1.5' }}>{turn.message}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      {new Date(turn.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {conversation.length === 0 && meetingStatus === 'running' && (
            <div style={{ padding: 20, textAlign: 'center', color: '#666', background: '#f5f5f5', borderRadius: 4 }}>
              <p>⏳ Waiting for meeting to start...</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <strong>Your Name:</strong>
            <input 
              type="text"
              placeholder="Enter your name (will identify your AI persona)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ 
                width: '100%', 
                padding: 8, 
                marginTop: 4,
                borderRadius: 4, 
                border: '1px solid #ddd',
                fontSize: 14
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <strong>Your Input:</strong>
            <textarea 
              rows={10} 
              placeholder="Your initial input for the meeting" 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              style={{ 
                width: '100%', 
                padding: 8, 
                marginTop: 4,
                borderRadius: 4, 
                border: '1px solid #ddd',
                fontSize: 14
              }}
            />
          </label>
          <button onClick={submit} disabled={!content.trim()}>Submit</button>
        </>
      )}
    </div>
  );
}
