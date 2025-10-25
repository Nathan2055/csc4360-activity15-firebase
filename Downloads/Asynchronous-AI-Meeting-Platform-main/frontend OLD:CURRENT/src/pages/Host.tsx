import React, { useState, useEffect } from 'react';
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

export function Host() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [emails, setEmails] = useState('');
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [inviteLinks, setInviteLinks] = useState<Array<{ email: string; url: string }>>([]);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [whiteboard, setWhiteboard] = useState<Whiteboard>({ keyFacts: [], decisions: [], actionItems: [] });
  const [humanMessage, setHumanMessage] = useState('');

  // Poll for conversation updates
  useEffect(() => {
    if (!meetingId || !token) return;
    
    const fetchConversation = async () => {
      try {
        const { data } = await axios.get(`/api/meetings/${meetingId}/status`);
        setConversation(data.history || []);
        setStatus(data.status);
        setWhiteboard(data.whiteboard || { keyFacts: [], decisions: [], actionItems: [] });
      } catch (err) {
        console.error('Failed to fetch conversation:', err);
      }
    };

    // Initial fetch
    fetchConversation();

    // Poll every 2 seconds
    const interval = setInterval(fetchConversation, 2000);
    return () => clearInterval(interval);
  }, [meetingId, token]);

  async function login() {
    const { data } = await axios.post('/api/auth/login', { password });
    setToken(data.token);
  }

  async function createMeeting() {
    if (!token) return;
    const { data } = await axios.post(
      '/api/meetings',
      {
        subject,
        details,
        participants: emails.split(/[,\n\s]+/).filter(Boolean),
        participantBaseUrl: window.location.origin + '/p'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setMeetingId(data.id);
    setStatus('awaiting_inputs');
    
    // Fetch participant tokens to display invite links
    await fetchInviteLinks(data.id);
  }

  async function fetchInviteLinks(meetingId: string) {
    if (!token) return;
    try {
      const { data } = await axios.get(`/api/meetings/${meetingId}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const links = data.participants.map((p: any) => ({
        email: p.email,
        url: `${window.location.origin}/p?token=${p.token}`
      }));
      setInviteLinks(links);
    } catch (err) {
      console.error('Failed to fetch invite links:', err);
    }
  }

  async function pause() {
    if (!token || !meetingId) return;
    const { data } = await axios.post(`/api/meetings/${meetingId}/pause`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setStatus(data.status);
  }

  async function resume() {
    if (!token || !meetingId) return;
    const { data } = await axios.post(`/api/meetings/${meetingId}/resume`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setStatus(data.status);
  }

  async function advance() {
    if (!token || !meetingId) return;
    const { data } = await axios.post(`/api/meetings/${meetingId}/advance`, {}, { headers: { Authorization: `Bearer ${token}` } });
    if (data.concluded) alert('Meeting concluded and report generated');
  }

  async function injectMessage() {
    if (!meetingId || !humanMessage.trim()) return;
    try {
      await axios.post(`/api/meetings/${meetingId}/inject`, {
        author: 'Host',
        message: humanMessage
      });
      setHumanMessage(''); // Clear input after sending
    } catch (err) {
      console.error('Failed to inject message:', err);
      alert('Failed to send message');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 600 }}>
      {!token ? (
        <div>
          <h3>Host Login</h3>
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={login}>Login</button>
        </div>
      ) : (
        <div>
          <h3>Create Meeting</h3>
          <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea placeholder="Details/Topics" value={details} onChange={(e) => setDetails(e.target.value)} />
          <textarea placeholder="Participant Emails (comma or newline)" value={emails} onChange={(e) => setEmails(e.target.value)} />
          <button onClick={createMeeting}>Create</button>
          {meetingId && (
            <div>
              <p>Meeting created. ID: {meetingId}</p>
              <p>Status: {status}</p>
              
              {/* Paused Meeting Alert */}
              {status === 'paused' && (
                <div style={{ 
                  marginTop: 16, 
                  padding: 16, 
                  background: '#fff3e0', 
                  border: '3px solid #ff9800', 
                  borderRadius: 8,
                  animation: 'pulse 2s ease-in-out infinite'
                }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#e65100' }}>
                    🛑 Meeting Paused - Human Input Needed
                  </h3>
                  <p style={{ margin: '8px 0', fontSize: 15, fontWeight: 'bold' }}>
                    The AI conversation has reached a crossroads and requires human guidance to continue.
                  </p>
                  <p style={{ margin: '8px 0', fontSize: 14, color: '#666' }}>
                    Please review the conversation below and use the "Host Interjection" box to provide your input or direction.
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: 13, fontStyle: 'italic', color: '#f57c00' }}>
                    💡 The meeting will automatically resume after you send a message.
                  </p>
                </div>
              )}
              
              {inviteLinks.length > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                  <h4>Participant Invite Links:</h4>
                  {inviteLinks.map((link, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <strong>{link.email}:</strong>
                      <br />
                      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                        {link.url}
                      </a>
                      <button 
                        onClick={() => navigator.clipboard.writeText(link.url)} 
                        style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px' }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  ))}
                  <p style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                    Share these links with participants to submit their input.
                  </p>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={pause}>Pause</button>
                <button onClick={resume}>Resume</button>
                <button onClick={advance}>Advance one turn</button>
              </div>
              
              {/* Host Interjection Box */}
              {(status === 'running' || status === 'paused') && (
                <div style={{ marginTop: 16, padding: 12, background: '#fff3e0', border: '2px solid #ff9800', borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0, color: '#f57c00' }}>💬 Host Interjection</h4>
                  <p style={{ fontSize: 13, marginBottom: 8, color: '#666' }}>
                    Add your input to guide the AI conversation. Your message will appear as "Human:Host" in the conversation.
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Type your message to inject into the conversation..."
                    value={humanMessage}
                    onChange={(e) => setHumanMessage(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', fontSize: 14 }}
                  />
                  <button 
                    onClick={injectMessage}
                    disabled={!humanMessage.trim()}
                    style={{ 
                      marginTop: 8, 
                      backgroundColor: '#ff9800', 
                      color: 'white',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 4,
                      cursor: humanMessage.trim() ? 'pointer' : 'not-allowed',
                      opacity: humanMessage.trim() ? 1 : 0.5
                    }}
                  >
                    📤 Send Message
                  </button>
                </div>
              )}
              
              {/* Whiteboard Display */}
              {(whiteboard.keyFacts.length > 0 || whiteboard.decisions.length > 0 || whiteboard.actionItems.length > 0) && (
                <div style={{ marginTop: 24, padding: 16, background: '#fff', border: '2px solid #4caf50', borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0, color: '#4caf50' }}>📊 Whiteboard</h4>
                  
                  {whiteboard.keyFacts.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <strong style={{ color: '#2196f3' }}>💡 Key Facts:</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {whiteboard.keyFacts.map((fact, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{fact}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {whiteboard.decisions.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <strong style={{ color: '#ff9800' }}>✅ Decisions:</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {whiteboard.decisions.map((decision, i) => (
                          <li key={i} style={{ marginBottom: 4, fontWeight: 'bold' }}>{decision}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {whiteboard.actionItems.length > 0 && (
                    <div>
                      <strong style={{ color: '#9c27b0' }}>🎯 Action Items:</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {whiteboard.actionItems.map((item, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{item}</li>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
