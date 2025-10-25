import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export function ParticipantPage(){
  const { code } = useParams()
  const [meeting, setMeeting] = useState<any>(null)
  const [participant, setParticipant] = useState<any>(null)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(()=>{
    fetch(`${API_BASE}/api/invite/${code}`).then(r=>r.json()).then(d=>{ setMeeting(d.meeting); setParticipant(d.participant) })
  },[code])

  async function submit(){
    await fetch(`${API_BASE}/api/participant/${participant.id}/input`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({input:text})})
    setSubmitted(true)
  }

  if (!meeting || !participant) return <div style={{padding:20}}>Loading…</div>

  return (
    <div style={{maxWidth:800, margin:'20px auto', padding:20}}>
      <h2>{meeting.subject}</h2>
      <p>{meeting.details}</p>
      {submitted ? <p>Thanks! You can close this tab.</p> : (
        <>
          <textarea value={text} onChange={e=>setText(e.target.value)} style={{width:'100%', height:200}} placeholder="Your initial input"/>
          <button onClick={submit} style={{marginTop:10}}>Submit</button>
        </>
      )}
    </div>
  )
}
