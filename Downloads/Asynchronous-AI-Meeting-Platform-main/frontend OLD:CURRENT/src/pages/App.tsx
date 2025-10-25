import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Host } from './Host';
import { Participant } from './Participant';
import { Meeting } from './Meeting';
import { Report } from './Report';

export function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', margin: 16 }}>
        <header style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>A²MP</h2>
          <nav style={{ display: 'flex', gap: 8 }}>
            <Link to="/">Home</Link>
            <Link to="/host">Host</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<Host />} />
          <Route path="/p" element={<Participant />} />
          <Route path="/m/:id" element={<Meeting />} />
          <Route path="/r/:id" element={<Report />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function Home() {
  return (
    <div>
      <p>Asynchronous AI-Moderated Meeting Platform.</p>
      <ul>
        <li>Host: create meetings, monitor, pause/resume, inject messages.</li>
        <li>Participant: open invite link to submit initial input.</li>
      </ul>
    </div>
  );
}
