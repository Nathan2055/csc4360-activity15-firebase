# A2MP Integration Flowchart & Architecture Guide

## Complete User Flows

### 1. Host Flow (Meeting Creator)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOST USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

1. LANDING PAGE
   ├─ User visits http://localhost:3000
   ├─ Sees landing page (currently working)
   └─ Clicks "Start Free Trial" or "Try Demo"

2. LOGIN
   ├─ Route: /login
   ├─ Component: /FRONTEND/app/login/page.tsx
   ├─ Frontend: Shows login form
   ├─ User enters password
   ├─ API Call: POST /api/auth/login { password }
   ├─ Backend: Returns { token: "xxx" }
   ├─ Frontend: Stores token in localStorage
   └─ Redirect: → /dashboard

3. DASHBOARD
   ├─ Route: /dashboard
   ├─ Component: /FRONTEND/app/dashboard/page.tsx
   ├─ API Call: GET /api/meetings (with Bearer token)
   ├─ Backend: Returns list of meetings
   ├─ Frontend: Shows meetings in grid
   └─ User Action: Clicks "Create New Meeting"

4. CREATE MEETING
   ├─ Route: /dashboard/create
   ├─ Component: /FRONTEND/app/dashboard/create/page.tsx
   ├─ Form Fields:
   │  ├─ Subject (e.g., "Q1 Product Strategy")
   │  ├─ Details (e.g., "Discuss priorities and timeline")
   │  └─ Participant Emails (comma-separated)
   ├─ User fills form and submits
   ├─ API Call: POST /api/meetings {
   │    subject, details, participants,
   │    participantBaseUrl: "http://localhost:3000/participate"
   │  }
   ├─ Backend: Creates meeting, generates tokens, sends emails
   └─ Redirect: → /meeting/[meetingId]

5. MEETING VIEW (Live Discussion)
   ├─ Route: /meeting/[id]
   ├─ Component: /FRONTEND/app/meeting/[id]/page.tsx
   ├─ Host sees:
   │  ├─ Meeting title & details
   │  ├─ Participant list (who submitted)
   │  ├─ Live conversation (polling every 2s)
   │  ├─ Whiteboard: Key Facts, Decisions, Action Items
   │  └─ Host Controls:
   │     ├─ ⏸ Pause button
   │     ├─ ▶ Resume button
   │     ├─ ⏭ Advance one turn button
   │     ├─ 💬 Inject message box
   ├─ API Calls:
   │  ├─ GET /api/meetings/[id]/status (polling)
   │  ├─ POST /api/meetings/[id]/pause (when paused)
   │  ├─ POST /api/meetings/[id]/resume (when resumed)
   │  ├─ POST /api/meetings/[id]/advance (next turn)
   │  └─ POST /api/meetings/[id]/inject (message)
   └─ Meeting continues until concluded

6. SUMMARY PAGE
   ├─ Route: /meeting/[id]/summary
   ├─ Component: /FRONTEND/app/meeting/[id]/summary/page.tsx
   ├─ Shown after meeting.status = "completed"
   ├─ API Call: GET /api/meetings/[id]/report
   ├─ Shows:
   │  ├─ Executive summary
   │  ├─ Key highlights
   │  ├─ Decisions made
   │  ├─ Action items
   │  └─ Visual discussion map
   └─ User can export or share

```

### 2. Participant Flow (Meeting Invitee)

```
┌─────────────────────────────────────────────────────────────────┐
│              PARTICIPANT USER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘

1. EMAIL INVITATION
   ├─ Host creates meeting with participant emails
   ├─ Backend sends emails with unique links:
   │  └─ "http://localhost:3000/participate/[id]?token=abc123xyz"
   └─ Participant receives email

2. PARTICIPATE PAGE (Submission)
   ├─ Route: /participate/[id]?token=abc123xyz
   ├─ Component: /FRONTEND/app/participate/[id]/page.tsx
   ├─ Frontend: Extracts token from URL
   ├─ API Call: GET /api/participant?token=abc123xyz
   ├─ Backend: Returns participant data + meeting details
   ├─ Frontend: Shows form with:
   │  ├─ Meeting title & details
   │  ├─ Name input (optional)
   │  └─ Input textarea (min 10 characters)
   ├─ Participant fills form
   ├─ API Call: POST /api/participant/submit {
   │    token, content, name
   │  }
   ├─ Backend: Creates AI persona from input
   └─ Status: ✅ Input submitted!

3. WATCH DISCUSSION
   ├─ Participant stays on same page
   ├─ Frontend: Polls GET /api/meetings/[id]/status
   ├─ Shows:
   │  ├─ Live conversation (auto-updates every 2s)
   │  ├─ Whiteboard contents
   │  ├─ Meeting status badge
   │  └─ "Add Your Voice" message box
   ├─ Frontend: May show AI persona representation
   └─ Meeting continues...

4. PARTICIPANT INTERJECTION (Optional)
   ├─ If meeting status = "running" or "paused"
   ├─ Participant can type message in "Add Your Voice" box
   ├─ API Call: POST /api/meetings/[id]/inject {
   │    author: participantName,
   │    message: "..."
   │  }
   ├─ Backend: Adds turn to conversation
   ├─ Frontend: Message appears in conversation
   └─ Meeting continues

5. MEETING COMPLETION
   ├─ Frontend: Detects status = "completed"
   ├─ Shows completion message
   ├─ Optionally redirects to /meeting/[id]/summary
   └─ Participant can view final report

```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     COMPLETE DATA FLOW                            │
└──────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────┐
    │  User Browser (FRONTEND - Next.js)                   │
    │  ├─ Landing Page (page.tsx)                          │
    │  ├─ Login Page (app/auth/login/page.tsx)             │
    │  ├─ Dashboard (app/dashboard/page.tsx)               │
    │  ├─ Create Form (app/dashboard/create/page.tsx)      │
    │  ├─ Meeting View (app/meeting/[id]/page.tsx)         │
    │  ├─ Participant Form (app/participate/[id]/page.tsx) │
    │  └─ Summary (app/meeting/[id]/summary/page.tsx)      │
    └──────────────────────────────────────────────────────┘
                            ↓ (HTTP/WS)
    ┌──────────────────────────────────────────────────────┐
    │  Backend API (Express.js on port 4000)               │
    │  ├─ POST   /api/auth/login                           │
    │  ├─ POST   /api/meetings                             │
    │  ├─ GET    /api/meetings/:id/status                  │
    │  ├─ GET    /api/meetings/:id/participants            │
    │  ├─ GET    /api/meetings/:id/report                  │
    │  ├─ POST   /api/meetings/:id/pause                   │
    │  ├─ POST   /api/meetings/:id/resume                  │
    │  ├─ POST   /api/meetings/:id/advance                 │
    │  ├─ POST   /api/meetings/:id/inject                  │
    │  ├─ GET    /api/participant?token=xxx                │
    │  └─ POST   /api/participant/submit                   │
    └──────────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────────┐
    │  Database (SQLite at backend/data/a2mp.db)           │
    │  ├─ meetings                                         │
    │  ├─ participants                                     │
    │  ├─ inputs                                           │
    │  ├─ personas                                         │
    │  ├─ conversation_turns                               │
    │  ├─ reports                                          │
    │  └─ (other tables)                                   │
    └──────────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────────┐
    │  External Services                                   │
    │  ├─ Gemini LLM API                                   │
    │  │  ├─ Generate personas from inputs                 │
    │  │  ├─ Moderate discussion                           │
    │  │  └─ Generate reports                              │
    │  └─ Email Service                                    │
    │     └─ Send invitation links                         │
    └──────────────────────────────────────────────────────┘

```

---

## State & Data Structures

### Frontend State (React Hooks)

```typescript
// Auth State
const [authToken, setAuthToken] = useState<string | null>(null)
const [isAuthenticated, setIsAuthenticated] = useState(false)

// Meeting State
const [meeting, setMeeting] = useState<Meeting | null>(null)
const [status, setStatus] = useState<MeetingStatus>('awaiting_inputs')
const [whiteboard, setWhiteboard] = useState<Whiteboard>({
  keyFacts: [],
  decisions: [],
  actionItems: []
})
const [conversation, setConversation] = useState<ConversationTurn[]>([])

// Participant State
const [participant, setParticipant] = useState<Participant | null>(null)
const [hasSubmitted, setHasSubmitted] = useState(false)
const [participantInput, setParticipantInput] = useState('')

// UI State
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Backend Database Schema (Key Tables)

```
┌─ meetings ─────────────────┐
│ id: UUID (PK)              │
│ subject: string            │
│ details: string            │
│ status: enum               │
│ whiteboard: JSON           │
│ createdAt: timestamp       │
└────────────────────────────┘

┌─ participants ─────────────┐
│ id: UUID (PK)              │
│ meetingId: UUID (FK)       │
│ email: string              │
│ token: string (unique)     │
│ hasSubmitted: boolean      │
│ createdAt: timestamp       │
└────────────────────────────┘

┌─ inputs ──────────────────┐
│ id: UUID (PK)             │
│ participantId: UUID (FK)  │
│ content: text             │
│ createdAt: timestamp      │
└───────────────────────────┘

┌─ personas ─────────────────┐
│ id: UUID (PK)              │
│ meetingId: UUID (FK)       │
│ participantId: UUID (FK)   │
│ role: enum                 │
│ name: string               │
│ mcp: JSON                  │
│ createdAt: timestamp       │
└────────────────────────────┘

┌─ conversation_turns ────────┐
│ id: UUID (PK)               │
│ meetingId: UUID (FK)        │
│ speaker: string             │
│ message: text               │
│ createdAt: timestamp        │
│ metadata: JSON (optional)   │
└─────────────────────────────┘

┌─ reports ──────────────────┐
│ id: UUID (PK)              │
│ meetingId: UUID (FK)       │
│ summary: text              │
│ highlights: JSON           │
│ decisions: JSON            │
│ actionItems: JSON          │
│ visualMap: JSON            │
│ createdAt: timestamp       │
└────────────────────────────┘
```

---

## Component Hierarchy

```
App Router
├── page.tsx (Landing)
│   ├── Header
│   ├── Hero Section
│   ├── Features
│   └── Footer
├── login/
│   └── page.tsx (Login Form)
│       └── Card
├── dashboard/
│   ├── page.tsx (Meetings List)
│   │   ├── Header
│   │   ├── Search & Filters
│   │   └── MeetingCard[]
│   └── create/
│       └── page.tsx (Create Form)
│           └── Form
├── meeting/
│   └── [id]/
│       ├── page.tsx (Live Discussion)
│       │   ├── ConversationList
│       │   ├── Whiteboard
│       │   ├── HostControls
│       │   └── MessageInjection
│       └── summary/
│           └── page.tsx (Report)
│               ├── Summary Section
│               ├── Highlights
│               ├── Decisions
│               ├── ActionItems
│               └── VisualMap
├── participate/
│   └── [id]/
│       └── page.tsx (Participant View)
│           ├── MeetingInfo
│           ├── SubmissionForm
│           ├── ConversationView
│           └── MessageInjection
└── demo/
    └── page.tsx (Demo Page)
```

---

## API Endpoint Map

```
Authentication
  POST /api/auth/login
       ↳ body: { password }
       ↳ response: { token }

Meetings
  POST /api/meetings
       ↳ headers: { Authorization: Bearer {token} }
       ↳ body: { subject, details, participants, participantBaseUrl }
       ↳ response: { id, subject, details, participants }

  GET /api/meetings/:id/status
       ↳ response: { status, whiteboard, history }

  GET /api/meetings/:id/participants
       ↳ headers: { Authorization: Bearer {token} }
       ↳ response: { participants }

  GET /api/meetings/:id/report
       ↳ response: { id, summary, highlights, decisions, actionItems, visualMap }

Host Controls
  POST /api/meetings/:id/pause
       ↳ headers: { Authorization: Bearer {token} }
       ↳ response: { status }

  POST /api/meetings/:id/resume
       ↳ headers: { Authorization: Bearer {token} }
       ↳ response: { status }

  POST /api/meetings/:id/advance
       ↳ headers: { Authorization: Bearer {token} }
       ↳ response: { concluded, report? }

  POST /api/meetings/:id/inject
       ↳ body: { author, message }
       ↳ response: { ok }

Participants
  GET /api/participant
       ↳ query: { token }
       ↳ response: { id, meetingId, email, hasSubmitted, subject, details }

  POST /api/participant/submit
       ↳ body: { token, content, name? }
       ↳ response: { ok, inputId }

Health
  GET /api/health
       ↳ response: { ok }

  GET /api/system/status
       ↳ headers: { Authorization: Bearer {token} }
       ↳ response: { rateLimiter, personaQueue }
```

---

## Environment & Configuration

### Backend Configuration

```env
# /backend/.env

# Server
PORT=4000
CORS_ORIGIN=http://localhost:3000

# Gemini API
GEMINI_API_KEY=your_api_key
GEMINI_MODERATOR_API_KEY=optional_separate_key

# Engine (optional)
DEV_MODE=true
ENGINE_TICK_MS=8000
MAX_TURNS_PER_MEETING=20

# Database
# (SQLite at /backend/backend/data/a2mp.db)
```

### Frontend Configuration

```env
# /FRONTEND/.env.local

# API
NEXT_PUBLIC_API_BASE=http://localhost:4000

# Optional: For production
# NEXT_PUBLIC_API_BASE=https://api.yourdomain.com
```

---

## Polling Strategy

```typescript
// How frontend keeps data in sync

export function useMeetingStatus(meetingId: string) {
  const [status, setStatus] = useState<any>(null)
  
  useEffect(() => {
    if (!meetingId) return
    
    // Initial fetch
    const fetchStatus = async () => {
      try {
        const data = await fetch(
          `${API_BASE}/api/meetings/${meetingId}/status`
        )
        setStatus(await data.json())
      } catch (err) {
        console.error('Fetch error:', err)
      }
    }
    
    fetchStatus()
    
    // Poll every 2 seconds
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [meetingId])
  
  return status
}

// Usage in component:
const status = useMeetingStatus(meetingId)
// Automatically updates every 2 seconds
```

---

## Error Handling Patterns

```typescript
try {
  const response = await fetch(`${API_BASE}/api/endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    // Handle HTTP errors
    if (response.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('authToken')
      router.push('/login')
    } else if (response.status === 404) {
      // Not found
      setError('Resource not found')
    } else {
      // Generic error
      const errorData = await response.json()
      setError(errorData.error || 'An error occurred')
    }
    return
  }

  const result = await response.json()
  // Handle success
  return result
  
} catch (err) {
  // Network error
  console.error('Network error:', err)
  setError('Failed to connect to server')
}
```

---

## Development Checklist

- [ ] Backend running on http://localhost:4000
- [ ] Frontend running on http://localhost:3000
- [ ] Backend `/api/health` returns `{ok: true}`
- [ ] Login endpoint works with password
- [ ] Token stored in localStorage after login
- [ ] Dashboard fetches meetings from backend
- [ ] Create meeting form sends data to backend
- [ ] Meeting page receives meeting ID from URL
- [ ] Polling updates conversation every 2 seconds
- [ ] Host controls (pause/resume/advance) work
- [ ] Participant portal accepts token from URL
- [ ] Participant submission creates AI persona
- [ ] Report page shows final summary

---

## Success Stories to Test

### Scenario 1: Happy Path
1. Host logs in
2. Creates meeting with 2 participants
3. Participants receive emails
4. Participant 1 submits input
5. Participant 2 submits input
6. AI discussion starts automatically
7. Host watches live discussion
8. Meeting concludes
9. Report is generated
10. All parties see final summary ✅

### Scenario 2: Host Intervention
1. Meeting running
2. Host pauses meeting
3. AI stops advancing turns
4. Host injects message
5. Meeting resumes automatically
6. AI continues discussion ✅

### Scenario 3: Participant Interjection
1. Meeting running
2. Participant types message
3. Message appears in conversation
4. AI acknowledges and continues ✅

