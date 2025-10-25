import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

export function Meeting() {
  const { id } = useParams();
  const [status, setStatus] = useState<string>('');
  const [whiteboard, setWhiteboard] = useState<{ keyFacts: string[]; decisions: string[]; actionItems: string[] }>({ keyFacts: [], decisions: [], actionItems: [] });
  const [history, setHistory] = useState<{ speaker: string; message: string; createdAt: number }[]>([]);
  const [author, setAuthor] = useState('User');
  const [msg, setMsg] = useState('');
  const [recognizing, setRecognizing] = useState(false);

  useEffect(() => {
    if (!id) return;
    load();
    const socket = io('/', { transports: ['websocket'] });
    socket.emit('join', id);
    socket.on('status', (p: any) => setStatus(p.status));
    socket.on('whiteboard', (wb: any) => setWhiteboard(wb));
    socket.on('turn', (turn: any) => setHistory((h) => [...h, { speaker: turn.speaker, message: turn.message, createdAt: turn.createdAt }]));
    return () => socket.close();
  }, [id]);

  async function load() {
    const { data } = await axios.get(`/api/meetings/${id}/status`);
    setStatus(data.status);
    setWhiteboard(data.whiteboard);
    setHistory(data.history);
  }

  async function inject() {
    await axios.post(`/api/meetings/${id}/inject`, { author, message: msg });
    setMsg('');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <div>
        <h3>Conversation ({status})</h3>
        <div style={{ border: '1px solid #ddd', padding: 8, height: 400, overflow: 'auto' }}>
          {history.map((t, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <b>{t.speaker}:</b> <span>{t.message}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} style={{ width: 120 }} />
          <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Inject message" style={{ flex: 1 }} />
          <button onClick={inject}>Send</button>
          <button onClick={() => startVoice(setMsg, setRecognizing)} disabled={recognizing} title="Voice to text">🎤</button>
        </div>
      </div>
      <div>
        <h3>Whiteboard</h3>
        <Section title="Key Facts" items={whiteboard.keyFacts} />
        <Section title="Decisions" items={whiteboard.decisions} />
        <Section title="Action Items" items={whiteboard.actionItems} />
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h4 style={{ marginBottom: 4 }}>{title}</h4>
      <ul>
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

// Simple Web Speech API helper
function startVoice(setText: (s: string) => void, setRecognizing: (b: boolean) => void) {
  const SpeechRecognition: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition not supported in this browser.');
    return;
  }
  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  recog.interimResults = true;
  setRecognizing(true);
  let finalText = '';
  recog.onresult = (ev: any) => {
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) finalText += t + ' ';
      setText(finalText + t);
    }
  };
  recog.onend = () => setRecognizing(false);
  recog.start();
}
