import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export function LivePage(){
  const { meetingId } = useParams()
  const [turns, setTurns] = useState<any[]>([])
  const [status, setStatus] = useState('idle')
  const [author, setAuthor] = useState('host')
  const [message, setMessage] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    fetch(`${API_BASE}/api/meetings/${meetingId}/turns`).then(r=>r.json()).then(setTurns)
    const es = new EventSource(`${API_BASE}/api/meetings/${meetingId}/stream`)
    es.addEventListener('turn', (ev:any)=>{ const t = JSON.parse(ev.data); setTurns(prev=>[...prev, t]); })
    es.addEventListener('status', (ev:any)=>{ const d = JSON.parse(ev.data); setStatus(d.status) })
    return ()=> es.close()
  },[meetingId])

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[turns])

  async function inject(){
    await fetch(`${API_BASE}/api/meetings/${meetingId}/inject`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({author, message})})
    setMessage('')
  }

  return (
    <div style={{maxWidth:900, margin:'20px auto', padding:20}}>
      <h2>Live Conversation</h2>
      <div style={{display:'flex', gap:10, marginBottom:10}}>
        <button onClick={()=>fetch(`${API_BASE}/api/meetings/${meetingId}/pause`,{method:'POST'})}>Pause</button>
        <button onClick={()=>fetch(`${API_BASE}/api/meetings/${meetingId}/resume`,{method:'POST'})}>Resume</button>
        <span>Status: {status}</span>
        <a href={`/report/${meetingId}`} style={{marginLeft:'auto'}}>View Final Report</a>
      </div>
      <div style={{border:'1px solid #ddd', borderRadius:6, padding:10, height:400, overflowY:'auto'}}>
        {turns.map((t,i)=> (
          <div key={i} style={{marginBottom:8}}>
            <b>{t.speaker}</b>: {t.content}
          </div>
        ))}
        <div ref={endRef}/>
      </div>

      <div style={{marginTop:12}}>
        <input value={author} onChange={e=>setAuthor(e.target.value)} title="Your name"/>
        <input value={message} onChange={e=>setMessage(e.target.value)} style={{width:'60%', marginLeft:8}} placeholder="Inject message"/>
        <button onClick={inject} style={{marginLeft:8}}>Send</button>
        <button onClick={()=>startVoice(setMessage)} style={{marginLeft:8}}>🎤 Voice</button>
      </div>
    </div>
  )
}

function startVoice(setter: (text: string)=>void){
  const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
  if (!SR) { alert('SpeechRecognition not supported'); return }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.onresult = (ev: any)=>{
    let s = '';
    for (const r of ev.results) s += r[0].transcript
    setter(s)
  }
  rec.start()
}
