# Backend Integration Summary - Quick Reference

## Key Differences: Old Frontend vs New Frontend

### Old Frontend (Minimalist - `/frontend OLD:CURRENT/`)
```
✓ Direct API calls with axios
✓ React Router SPA
✓ Inline CSS styles
✓ Basic UI components
✓ Works with backend API directly
✓ 4 pages: Home, Host, Participant, Meeting, Report
```

### New Frontend (Modern - `/FRONTEND/`)
```
✓ Next.js 14+ with App Router
✓ Shadcn/ui components
✓ Tailwind CSS
✓ Beautiful landing page
✓ Currently mock data only
✗ Pages exist but not connected to backend
```

---

## Critical Information for Integration

### Backend Overview
- **Port**: 4000 (default)
- **Database**: SQLite at `/backend/backend/data/a2mp.db`
- **Main Routes**: `/backend/src/routes.ts`
- **Services**: 
  - `meetingService` - Meeting CRUD
  - `participantService` - Participant management
  - `conversationService` - AI conversation & moderation
- **Real-time**: WebSocket support via `realtime.ts`

### Authentication
- **Type**: Password-based (host only)
- **Endpoint**: `POST /api/auth/login` with `{ password }`
- **Response**: `{ token: string }`
- **Usage**: Include `Authorization: Bearer {token}` in headers

### Participant Flow
- **Token-based**: Each participant gets unique token
- **URL Pattern**: `/participate/[token]?token=xyz`
- **No Login**: Token in URL is sufficient
- **Submission**: Generates AI persona automatically

### Meeting Lifecycle
```
1. awaiting_inputs   → Waiting for participants to submit
2. running          → AI discussion in progress
3. paused           → Waiting for human intervention
4. completed        → Meeting finished, report generated
```

---

## What's Missing in New Frontend

### Pages to Build/Connect
1. **Login** - Has mock, needs backend `/api/auth/login`
2. **Dashboard** - Has mock, needs real meetings from backend
3. **Dashboard/Create** - Doesn't exist, needs form + API call
4. **Meeting/[id]** - Doesn't exist, needs live discussion view
5. **Participate/[id]** - Doesn't exist, needs participant form
6. **Meeting/[id]/Summary** - Doesn't exist, needs report view

### Features to Add
- [ ] Authentication context/state management
- [ ] Real-time updates (polling or WebSocket)
- [ ] Meeting creation flow
- [ ] Live discussion viewer
- [ ] Host controls (pause/resume/advance/inject)
- [ ] Participant submission form
- [ ] Report/summary viewer

---

## API Layer Template

```typescript
// /FRONTEND/lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

// Auth
export async function login(password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  if (!res.ok) throw new Error('Login failed')
  return res.json()
}

// Meetings
export async function createMeeting(data: any, token: string) {
  const res = await fetch(`${API_BASE}/api/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create meeting')
  return res.json()
}

export async function getMeetingStatus(id: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${id}/status`)
  if (!res.ok) throw new Error('Failed to fetch meeting status')
  return res.json()
}

export async function getMeetingReport(id: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${id}/report`)
  if (!res.ok) throw new Error('Failed to fetch report')
  return res.json()
}

// Host Controls
export async function pauseMeeting(id: string, token: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${id}/pause`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to pause meeting')
  return res.json()
}

export async function injectMessage(id: string, author: string, message: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${id}/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, message })
  })
  if (!res.ok) throw new Error('Failed to inject message')
  return res.json()
}

// Participant
export async function getParticipantData(token: string) {
  const res = await fetch(`${API_BASE}/api/participant?token=${token}`)
  if (!res.ok) throw new Error('Invalid participant token')
  return res.json()
}

export async function submitParticipantInput(token: string, content: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/participant/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, content, name })
  })
  if (!res.ok) throw new Error('Failed to submit input')
  return res.json()
}
```

---

## Environment Setup

### Backend (.env in /backend/)
```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your_key_here
GEMINI_MODERATOR_API_KEY=optional_separate_key
```

### Frontend (.env.local in /FRONTEND/)
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

---

## Testing the Integration

### Step 1: Start Backend
```bash
cd backend
npm install
npm run dev
# Should show: "A²MP backend running on http://localhost:4000"
```

### Step 2: Verify Backend Health
```bash
curl http://localhost:4000/api/health
# Response: {"ok":true}
```

### Step 3: Test Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'
# Response: {"token":"..."}
```

### Step 4: Start Frontend
```bash
cd FRONTEND
npm install
npm run dev
# Visit http://localhost:3000
```

### Step 5: Test Login in UI
- Go to http://localhost:3000/login
- Enter password
- Should redirect to /dashboard on success

---

## Component Reference from Old Frontend

These components/patterns work well and can be ported:

### Conversation Display Pattern
```typescript
{conversation.map((turn, i) => {
  const isAI = turn.speaker.startsWith('AI:');
  const isModerator = turn.speaker.includes('Moderator');
  const isHuman = turn.speaker.startsWith('Human:');
  
  let bgColor, borderColor, emoji;
  // ... styling logic
  
  return (
    <div key={turn.id} style={{ background: bgColor, borderLeft: `4px solid ${borderColor}` }}>
      <div>{emoji} {turn.speaker}</div>
      <div>{turn.message}</div>
      <div>{new Date(turn.createdAt).toLocaleTimeString()}</div>
    </div>
  );
})}
```

### Whiteboard Display Pattern
```typescript
<div>
  {whiteboard.keyFacts.length > 0 && (
    <div>
      <strong style={{ color: '#2196f3' }}>💡 Key Facts:</strong>
      <ul>
        {whiteboard.keyFacts.map((fact, i) => <li key={i}>{fact}</li>)}
      </ul>
    </div>
  )}
  {/* Similar for decisions and actionItems */}
</div>
```

### Polling Pattern
```typescript
useEffect(() => {
  if (!meetingId) return;
  
  const fetchStatus = async () => {
    try {
      const data = await getMeetingStatus(meetingId);
      setStatus(data.status);
      setWhiteboard(data.whiteboard);
      setHistory(data.history);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  fetchStatus(); // Initial
  const interval = setInterval(fetchStatus, 2000); // Poll every 2s
  return () => clearInterval(interval);
}, [meetingId]);
```

---

## Common Integration Patterns

### Pattern 1: Auth Protection
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedPage() {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem('authToken');
    if (!t) {
      router.push('/login');
    } else {
      setToken(t);
    }
  }, []);

  if (!token) return <div>Loading...</div>;
  return <YourComponent token={token} />;
}
```

### Pattern 2: URL Token Extraction
```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ParticipantPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get('token');
    setToken(t);
    if (t) {
      loadParticipantData(t);
    }
  }, [searchParams]);

  // ...
}
```

### Pattern 3: Polling Hook
```typescript
function useMeetingStatus(meetingId: string | null, pollInterval = 2000) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;

    const fetch = async () => {
      try {
        setLoading(true);
        const data = await getMeetingStatus(meetingId);
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, pollInterval);
    return () => clearInterval(interval);
  }, [meetingId, pollInterval]);

  return { status, loading, error };
}
```

---

## Troubleshooting

### Backend not starting
```
❌ Error: EADDRINUSE: address already in use :::4000
✓ Solution: Kill process on port 4000 or change PORT env var
```

### CORS errors
```
❌ Error: Access to XMLHttpRequest blocked by CORS policy
✓ Solution: Ensure CORS_ORIGIN includes http://localhost:3000
```

### Token not working
```
❌ Error: 401 Unauthorized
✓ Solution: Include Authorization header: Bearer {token}
```

### Frontend can't reach backend
```
❌ Error: Failed to fetch
✓ Solution: Check NEXT_PUBLIC_API_BASE env var points to correct backend URL
```

---

## Success Criteria for Integration

✅ User can login with password
✅ User sees list of meetings on dashboard
✅ User can create a new meeting
✅ Participant can access via email link
✅ Participant can submit input
✅ Host can see live discussion
✅ Host controls work (pause/resume/advance)
✅ Participant can inject messages
✅ Report page shows final summary
✅ Real-time updates work (polling or WebSocket)

