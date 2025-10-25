# A2MP Backend Integration Analysis

## Executive Summary

This document outlines the integration strategy for connecting the new **Next.js frontend** (`/FRONTEND`) with the existing **Node.js/Express backend** (`/backend`). The backend is production-ready with AI-powered async meetings, but the new frontend is a landing page that needs functional pages for:

1. **Host Dashboard**: Create and manage meetings
2. **Meeting Management**: Live discussion view with host controls
3. **Participant Portal**: Submit input and watch discussions
4. **Report/Summary**: View final decisions and action items

---

## Architecture Overview

### Backend Stack (Production Ready)
- **Framework**: Express.js
- **Database**: SQLite (a2mp.db)
- **LLM**: Gemini API with rate limiting & queuing
- **Real-time**: Custom WebSocket/SSE implementation
- **Auth**: Host password-based authentication

### Frontend Stack (To Be Integrated)
- **Framework**: Next.js 14+ (App Router)
- **UI Components**: Shadcn/ui
- **Styling**: Tailwind CSS
- **API Layer**: To be created/updated

### Data Flow
```
Frontend (Next.js) 
    ↓ (HTTP/WS)
Backend (Express)
    ↓
Database (SQLite)
    ↓
Gemini LLM API
```

---

## Backend API Reference

### Core Endpoints

#### 1. **Authentication**
```
POST /api/auth/login
Body: { password: string }
Response: { token: string }
```

#### 2. **Meeting Management**
```
POST /api/meetings (Requires: Bearer token)
Body: {
  subject: string,
  details: string,
  participants: string[],        // Email addresses
  participantBaseUrl: string      // Frontend URL base for participant links
}
Response: {
  id: string,
  subject: string,
  details: string,
  participants: Array<{ id, email }>
}

GET /api/meetings/:id/status
Response: {
  status: "awaiting_inputs" | "running" | "paused" | "completed",
  whiteboard: { keyFacts[], decisions[], actionItems[] },
  history: Array<{ id, speaker, message, createdAt }>
}

GET /api/meetings/:id/participants (Requires: Bearer token)
Response: { participants: Array<{ id, email, token, hasSubmitted }> }

GET /api/meetings/:id/report
Response: {
  id, meetingId, summary,
  highlights[], decisions[], actionItems[],
  visualMap: { nodes[], edges[] },
  createdAt
}
```

#### 3. **Host Controls**
```
POST /api/meetings/:id/pause (Requires: Bearer token)
Response: { status: "paused" }

POST /api/meetings/:id/resume (Requires: Bearer token)
Response: { status: "running" }

POST /api/meetings/:id/advance (Requires: Bearer token)
Response: { concluded: boolean, report?: ... }

POST /api/meetings/:id/inject
Body: { author: string, message: string }
Response: { ok: true }
```

#### 4. **Participant Flow**
```
GET /api/participant?token=xxx
Response: {
  id, meetingId, email, hasSubmitted,
  subject, details
}

POST /api/participant/submit
Body: {
  token: string,
  content: string,
  name?: string
}
Response: { ok: true, inputId: string }
```

#### 5. **System Status**
```
GET /api/health
Response: { ok: true }

GET /api/system/status (Requires: Bearer token)
Response: {
  rateLimiter: {...},
  personaQueue: {...}
}
```

### Real-time Events (WebSocket/SSE)

The backend emits status updates via `realtimeBus`:
- **`status`**: Meeting status changed
- **`turn`**: New conversation turn added
- **`whiteboard`**: Whiteboard updated

---

## Frontend Architecture Required

### 1. **File Structure**
```
/FRONTEND
├── app/
│   ├── api/                      # API routes (optional, for proxying)
│   ├── auth/
│   │   └── login/page.tsx        # ✅ EXISTS - Needs backend integration
│   ├── dashboard/                # ✅ EXISTS (mock) - Needs data integration
│   │   ├── page.tsx              # Meeting list
│   │   └── create/
│   │       └── page.tsx          # Create meeting form
│   ├── meeting/
│   │   └── [id]/
│   │       ├── page.tsx          # Live discussion (host view)
│   │       └── summary/
│   │           └── page.tsx      # Report/summary view
│   ├── participate/
│   │   └── [id]/
│   │       └── page.tsx          # Participant submission form
│   ├── demo/
│   │   └── page.tsx              # ✅ EXISTS - Demo page
│   └── page.tsx                  # ✅ EXISTS - Landing page
└── lib/
    └── api.ts                    # ❌ NEEDS UPDATE - Actual backend calls
```

### 2. **Key Components to Build**

| Component | Purpose | Status |
|-----------|---------|--------|
| `DashboardPage` | List meetings, create new | Exists (mock data) |
| `CreateMeetingPage` | Form to create meeting | Needs building |
| `MeetingPage` | Live discussion + host controls | Needs building |
| `ParticipantPage` | Submission form & watch | Needs building |
| `ReportPage` | Final summary/decisions | Needs building |
| `LoginPage` | Authentication | Exists (mock) |

### 3. **State Management**
- Use React hooks (`useState`, `useEffect`) for local state
- Store auth token in localStorage
- Implement polling or WebSocket for real-time updates
- Consider adding Context API or Zustand for global auth state

---

## Integration Implementation Steps

### Phase 1: API Layer ✅
**File: `/FRONTEND/lib/api.ts`**

Update the API utility to match backend endpoints:

```typescript
// Authentication
export async function login(password: string): Promise<{ token: string }>

// Meetings
export async function createMeeting(data: {
  subject: string
  details: string
  participants: string[]
  participantBaseUrl: string
}): Promise<Meeting>

export async function getMeetingStatus(id: string): Promise<MeetingStatus>
export async function getMeetingParticipants(id: string, token: string)
export async function getMeetingReport(id: string): Promise<Report>

// Host controls
export async function pauseMeeting(id: string, token: string)
export async function resumeMeeting(id: string, token: string)
export async function advanceMeeting(id: string, token: string)
export async function injectMessage(id: string, author: string, message: string)

// Participant flow
export async function getParticipantData(token: string): Promise<ParticipantData>
export async function submitParticipantInput(token: string, data: {
  content: string
  name?: string
})
```

### Phase 2: Authentication ✅
**File: `/FRONTEND/app/auth/login/page.tsx`**

- Replace mock credentials with actual backend `/api/auth/login`
- Store token in `localStorage` or secure cookie
- Redirect to `/dashboard` on success
- Add global auth context/hook

### Phase 3: Dashboard ✅
**File: `/FRONTEND/app/dashboard/page.tsx`**

- Fetch meetings from backend (auth required)
- Display real meeting data
- Implement search/filter
- Add "Create Meeting" button

### Phase 4: Create Meeting ✅
**File: `/FRONTEND/app/dashboard/create/page.tsx`**

- Form with subject, details, participant emails
- Call `/api/meetings` POST endpoint
- Redirect to meeting page on success
- Handle errors gracefully

### Phase 5: Meeting View ✅
**File: `/FRONTEND/app/meeting/[id]/page.tsx`**

- Fetch meeting status on load
- Display whiteboard (key facts, decisions, action items)
- Display conversation history
- Host controls: pause/resume/advance/inject
- Real-time updates via polling or WebSocket

### Phase 6: Participant Portal ✅
**File: `/FRONTEND/app/participate/[id]/page.tsx`**

- Extract token from URL query params
- Fetch participant data
- Form for name + input submission
- Show discussion while waiting/after submission
- Participant message injection

### Phase 7: Summary/Report ✅
**File: `/FRONTEND/app/meeting/[id]/summary/page.tsx`**

- Fetch report from `/api/meetings/:id/report`
- Display summary, highlights, decisions, action items
- Show visual discussion map (graph visualization)
- Export options (PDF, email)

---

## Type Definitions

Create `/FRONTEND/lib/types.ts`:

```typescript
// From backend
export type MeetingStatus = "awaiting_inputs" | "running" | "paused" | "completed"

export interface Meeting {
  id: string
  subject: string
  details: string
  status: MeetingStatus
  createdAt: string
}

export interface ConversationTurn {
  id: string
  speaker: string
  message: string
  createdAt: string
}

export interface Whiteboard {
  keyFacts: string[]
  decisions: string[]
  actionItems: string[]
}

export interface Report {
  id: string
  meetingId: string
  summary: string
  highlights: string[]
  decisions: string[]
  actionItems: string[]
  visualMap: { nodes: any[]; edges: any[] }
  createdAt: string
}

export interface Participant {
  id: string
  email: string
  hasSubmitted: boolean
}

export interface AuthResponse {
  token: string
}
```

---

## Environment Configuration

Add to `/FRONTEND/.env.local`:

```env
# Backend API
NEXT_PUBLIC_API_BASE=http://localhost:4000
# Or for production:
# NEXT_PUBLIC_API_BASE=https://api.a2mp.com
```

---

## Authentication Pattern

### For Hosts:
1. Login with password → get token
2. Store token in localStorage
3. Include in Authorization header: `Bearer {token}`
4. Redirect to dashboard
5. Token persists across page refreshes

### For Participants:
1. Access via unique link with `?token=xxx`
2. No separate login needed
3. Token embedded in URLs for invite links

---

## Real-time Updates Strategy

### Option 1: Polling (Simple, Current)
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchMeetingStatus(id)
  }, 2000)
  return () => clearInterval(interval)
}, [id])
```

### Option 2: WebSocket (Advanced)
- Backend has WebSocket support via `realtime` module
- Create wrapper hook: `useRealtimeUpdates(meetingId)`
- Listen to 'status', 'turn', 'whiteboard' events

---

## Error Handling

Common error scenarios:

1. **Invalid token**: Redirect to login
2. **Meeting not found**: Show 404 page
3. **Network error**: Show retry message
4. **Unauthorized**: Redirect to login
5. **Validation error**: Show form errors

---

## Development Workflow

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd FRONTEND
npm install
npm run dev

# Visit http://localhost:3000
```

---

## Integration Checklist

- [ ] Update `lib/api.ts` with real backend endpoints
- [ ] Update `app/auth/login/page.tsx` with backend auth
- [ ] Create `app/auth/context.tsx` for auth state
- [ ] Create `app/dashboard/create/page.tsx` for meeting creation
- [ ] Update `app/dashboard/page.tsx` to fetch real meetings
- [ ] Create `app/meeting/[id]/page.tsx` for live discussion
- [ ] Create `app/participate/[id]/page.tsx` for participant portal
- [ ] Create `app/meeting/[id]/summary/page.tsx` for reports
- [ ] Add environment configuration
- [ ] Implement error handling & loading states
- [ ] Add real-time updates (polling or WebSocket)
- [ ] Test complete flow end-to-end

---

## Performance Considerations

1. **Polling vs WebSocket**: Start with polling, optimize to WebSocket if needed
2. **Image optimization**: Use `next/image` for all images
3. **Code splitting**: Built-in with Next.js App Router
4. **Caching**: Use `revalidateTag` or `revalidatePath` for ISR

---

## Security Considerations

1. **CORS**: Backend configured, frontend sends credentials
2. **HTTPS**: Required in production
3. **Tokens**: Store in localStorage (consider HttpOnly cookies)
4. **Input validation**: Validate all forms before sending
5. **XSS prevention**: Use React's built-in escaping

---

## Next Steps

1. **Start with Phase 1**: Update API layer
2. **Test endpoints**: Use curl/Postman to verify backend
3. **Build incrementally**: Phase by phase
4. **User testing**: Test participant and host flows
5. **Optimize**: Add real-time updates & performance tuning

