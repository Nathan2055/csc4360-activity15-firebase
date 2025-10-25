import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { HostPage } from './pages/HostPage'
import { ParticipantPage } from './pages/ParticipantPage'
import { LivePage } from './pages/LivePage'
import { ReportPage } from './pages/ReportPage'

function App() {
  return (
    <BrowserRouter>
      <nav style={{padding:10, display:'flex', gap:10, borderBottom:'1px solid #ddd'}}>
        <Link to="/">Host</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HostPage/>} />
        <Route path="/p/:code" element={<ParticipantPage/>} />
        <Route path="/live/:meetingId" element={<LivePage/>} />
        <Route path="/report/:meetingId" element={<ReportPage/>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
