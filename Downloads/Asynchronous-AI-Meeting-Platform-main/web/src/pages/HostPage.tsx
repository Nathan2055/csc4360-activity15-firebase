import React, { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export function HostPage(){
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [emails, setEmails] = useState('')
  const [created, setCreated] = useState<any>(null)

  async function createMeeting(){
    const participants = emails.split(/[,\n]/).map(e=>e.trim()).filter(Boolean)
    const res = await fetch(`${API_BASE}/api/meetings`,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({subject, details, participants})})
    const data = await res.json()
    setCreated(data)
  }

  return (
    <div style={{maxWidth:800, margin:'20px auto', padding:20}}>
      <h2>Create Meeting</h2>
      <label>Subject</label>
      <input value={subject} onChange={e=>setSubject(e.target.value)} style={{width:'100%', padding:8}}/>
      <label>Details / Topics</label>
      <textarea value={details} onChange={e=>setDetails(e.target.value)} style={{width:'100%', height:120}}/>
      <label>Participant Emails (comma or newline)</label>
      <textarea value={emails} onChange={e=>setEmails(e.target.value)} style={{width:'100%', height:100}}/>
      <button onClick={createMeeting} style={{marginTop:10}}>Create & Send Invites</button>

      {created && (
        <div style={{marginTop:20}}>
          <h3>Invites</h3>
          <ul>
            {created.invites?.map((i:any)=>(<li key={i.email}><a href={i.url} target="_blank">{i.email}</a></li>))}
          </ul>
          <div>
            <button onClick={async()=>{await fetch(`${API_BASE}/api/meetings/${created.meetingId}/start`,{method:'POST'}); alert('Attempted to start. If all inputs submitted, conversation will run.');}}>Start Conversation</button>
            <a href={`/live/${created.meetingId}`} style={{marginLeft:10}}>Open Live View</a>
          </div>
        </div>
      )}
    </div>
  )
}
