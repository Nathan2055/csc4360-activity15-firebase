# A²MP - Asynchronous AI Meeting Platform# A²MP - Asynchronous AI Meeting Platform# A²MP — Asynchronous AI Meeting Platform## A²MP — AI‑Augmented Meeting Personas (Monorepo)



Transform asynchronous collaboration with AI-powered meeting personas that discuss, debate, and reach consensus on your behalf.



## Overview> Transform asynchronous collaboration with AI-powered meeting personas that discuss, debate, and reach consensus on your behalf.



A²MP enables structured virtual meetings where AI personas represent different stakeholders. Participants submit their inputs once, then AI agents autonomously discuss the topic, collaborate, ask questions, and work toward consensus.



**Use Cases:**## Overview> Transform asynchronous collaboration with AI-powered meeting personas that discuss, debate, and reach consensus on your behalf.A²MP helps you run structured meetings where participants submit initial inputs, AI personas discuss in rounds, and a clear report is produced at the end. This repository contains two parallel implementations you can run:

- Distributed decision-making across time zones

- Budget planning with multiple stakeholders

- Strategic planning sessions

- Conflict resolution and compromise buildingA²MP (Asynchronous AI Meeting Platform) enables structured virtual meetings where AI personas represent different stakeholders. Participants submit their inputs once, then AI agents discuss the topic in real-time, collaborate, ask questions, and work toward consensus completely autonomously.

- Asynchronous brainstorming and ideation



**Key Features:**

- AI personas generated from participant inputs**Perfect for:**## Overview- backend + frontend (recommended for local dev)

- Natural conversational flow with turn-taking

- Automatic pause when human input needed- 🗳️ Distributed decision-making across time zones

- Real-time conversation streaming

- Collaborative whiteboard tracking- 💼 Budget planning with multiple stakeholders- server + web (alternative stack with a single API and separate UI)

- Smart repetition detection

- Dual API key support for quota isolation- 🎯 Strategic planning sessions



---- 🤝 Conflict resolution and compromise buildingA²MP (Asynchronous AI Meeting Platform) enables structured virtual meetings where AI personas represent different stakeholders. Participants submit their inputs once, then AI agents discuss the topic in real-time, collaborate, ask questions, and work toward consensus completely autonomously.



## Quick Start- 📊 Asynchronous brainstorming and ideation



### Prerequisites### Repository layout

- Node.js 20+

- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))**Key Features:**



### Installation- ✅ AI personas generated from participant inputs**Perfect for:**- `backend/`: Express API + Socket.IO realtime + conversation engine, SQLite persistence



```bash- ✅ Natural conversational flow with turn-taking

git clone <your-repo-url>

cd Asynchronous-AI-Meeting-Platform- ✅ Automatic pause when human input needed- 🗳️ Distributed decision-making across time zones- `frontend/`: Vite + React UI that proxies to `backend`



# Install dependencies- ✅ Real-time conversation streaming

npm install

npm install --prefix backend- ✅ Collaborative whiteboard tracking- 💼 Budget planning with multiple stakeholders- `server/`: Alternative Express API (consolidated variant), SQLite persistence

npm install --prefix frontend

```- ✅ Automatic report generation



### Configuration- ✅ Smart repetition detection- 🎯 Strategic planning sessions- `web/`: Vite + React UI targeting `server`



```bash- ✅ Dual API key support for quota isolation

# Copy the example file

cp backend/.env.example backend/.env- 🤝 Conflict resolution and compromise building- `LICENSE`: Proprietary, evaluation‑only license

```

---

Edit `backend/.env` and set your API keys:

```env- 📊 Asynchronous brainstorming and ideation

GEMINI_API_KEY=your-api-key-here

GEMINI_MODERATOR_API_KEY=your-moderator-api-key-here## Quick Start

```

### Requirements

### Run

### Prerequisites

```bash

npm run dev- **Node.js 20+** (required)**Key Features:**- Node.js 18+ (Node 20+ recommended)

```

- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

- Backend: http://localhost:4000

- Frontend: http://localhost:5174- Optional: SMTP credentials for email invitations- ✅ AI personas generated from participant inputs



### First Meeting



1. Open http://localhost:5174### 1. Clone & Install- ✅ Natural conversational flow with turn-taking---

2. Login as host (password: `password`)

3. Create a meeting with 2+ participants

4. Share participant links

5. Submit inputs as each participant```bash- ✅ Automatic pause when human input needed

6. Watch the AI conversation

git clone <your-repo-url>

---

cd Asynchronous-AI-Meeting-Platform- ✅ Real-time conversation streaming## Option A: Run backend + frontend (recommended)

## How It Works

npm install

### Persona Generation

Each participant's input is analyzed to create a unique AI persona with:npm install --prefix backend- ✅ Collaborative whiteboard trackingThis pair is wired together via Vite dev proxy and root scripts.

- Identity and role description

- Objectives and prioritiesnpm install --prefix frontend

- Communication style

- Model Context Protocol (MCP) instructions```- ✅ Automatic report generation



### Conversation Engine

Runs every 15 seconds (configurable):

- Checks for meetings in "running" status### 2. Configure Environment- ✅ Smart repetition detection### Install

- Moderator decides next speaker

- Generates AI response

- Detects repetition patterns

- Checks for natural conclusion```bash- ✅ Dual API key support for quota isolationFrom the repo root:



### Smart Turn-Taking# Copy the example file

1. **Direct Questions**: If an AI asks another a question, let them respond

2. **First-Time Speakers**: Everyone speaks before anyone repeatscp backend/.env.example backend/.env```bash

3. **Alternation**: Prefers A→B→A→B pattern

4. **Free Choice**: Any speaker if no constraints



### Collaboration# Edit backend/.env with your API keys---# root dev tooling (concurrently, prettier)

AI personas are instructed to:

- Build on others' ideas# At minimum, set:

- Find common ground

- Make concessions when appropriate# - GEMINI_API_KEYnpm install

- Propose integrated solutions

- Avoid repeating themselves# - GEMINI_MODERATOR_API_KEY (or use same as above)



---```## Quick Start# app dependencies



## Configuration



See `backend/.env.example` for complete template.### 3. Run Development Servernpm install --prefix backend



**Required:**

```env

GEMINI_API_KEY=your-api-key-here```bash### Prerequisitesnpm install --prefix frontend

GEMINI_MODERATOR_API_KEY=your-moderator-api-key-here

```npm run dev



**Server:**```- **Node.js 20+** (required)```

```env

PORT=4000

CORS_ORIGIN=http://localhost:5174

HOST_PASSWORD=your-secure-passwordThis starts:- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

JWT_SECRET=your-jwt-secret-key

```- 🔧 Backend API on http://localhost:4000



**AI Settings:**- 🎨 Frontend UI on http://localhost:5174- Optional: SMTP credentials for email invitations### Configure environment (optional but recommended)

```env

GEMINI_MODEL=gemini-2.5-flash

ENGINE_TICK_MS=15000

MAX_TURNS_PER_MEETING=10### 4. Create Your First MeetingCreate `backend/.env` with any overrides:

```



**Email (Optional):**

```env1. Open http://localhost:5174### 1. Clone & Install```bash

SMTP_HOST=smtp.gmail.com

SMTP_PORT=5872. Log in as host (default password: `password`)

SMTP_USER=your-email@gmail.com

SMTP_PASS=your-app-password3. Create a meeting with 2 participants```bash# Backend API

MAIL_FROM=noreply@yourdomain.com

```4. Share participant links



---5. Submit inputs as participantsgit clone <your-repo-url>PORT=4000



## API Endpoints6. Watch the AI conversation unfold!



**Meetings:**cd Asynchronous-AI-Meeting-PlatformCORS_ORIGIN=http://localhost:5173

- `POST /api/meetings` - Create meeting

- `GET /api/meetings/:id/status` - Get status with conversation---

- `POST /api/meetings/:id/inject` - Inject human message

- `POST /api/meetings/:id/advance` - Advance one turn (host)npm install



**Participants:**## How It Works

- `GET /api/participant?token=xxx` - Get participant details

- `POST /api/participant/submit` - Submit inputnpm install --prefix backend# Host auth



**Authentication:**### 1. Persona Generation

- `POST /api/auth/host/login` - Host login

When a participant submits input, the system:npm install --prefix frontendHOST_PASSWORD=change-me

**Real-time:**

- `GET /api/meetings/:id/stream` - SSE for live updates- Analyzes their perspective and priorities



---- Generates a unique AI persona with identity, objectives, and communication style```JWT_SECRET=dev-secret-change-me



## Debugging Tools- Creates Model Context Protocol (MCP) instructions for the persona



```bash

node check-conversation.js [meetingId]  # View conversation

node check-report.js [meetingId]        # View report### 2. Conversation Engine

node list-meetings.js                   # List all meetings

node check-db.js                        # View databaseThe engine runs on a timer (default: every 15 seconds):### 2. Configure Environment# LLM (Google Gemini)

node check-quota.js                     # Check API quota

```- Checks for meetings in "running" status



---- Calls moderator to decide next speaker```bashGEMINI_API_KEY=your-gemini-api-key



## Troubleshooting- Generates AI response from selected persona



**Meeting Not Starting**- Detects repetition patterns and pauses if stuck# Copy the example fileGEMINI_MODEL=gemini-1.5-pro

- Verify all participants submitted

- Check: `node list-meetings.js`- Checks for natural conclusion points

- Engine logs should run every 15 seconds

cp backend/.env.example backend/.env

**API Key Issues**

- Verify at [Google AI Studio](https://makersuite.google.com/app/apikey)### 3. Smart Turn-Taking

- Check quota: `node check-quota.js`

- Both keys must be set in `.env`Moderator uses priority logic:# Email (SMTP); if omitted, dev uses a JSON/log transport



**Personas Repeating**1. **Direct Questions**: If AI asks another AI a question, let them respond

- Try more diverse participant inputs

- Check: `node check-conversation.js`2. **First-Time Speakers**: Give everyone a chance before repeating# Edit backend/.env with your API keysSMTP_HOST=



**No Report Generated**3. **Alternation**: Prefer switching speakers (A→B→A→B)

- Check: `node check-report.js [meetingId]`

- Verify meeting status is "completed"4. **Free Choice**: Any speaker if no constraints# At minimum, set:SMTP_PORT=587



---



## Production Deployment### 4. Collaboration# - GEMINI_API_KEYSMTP_USER=



**Security:**AI personas are instructed to:

- Change `HOST_PASSWORD` to strong password

- Set unique `JWT_SECRET` (32+ characters)- Build on others' ideas# - GEMINI_MODERATOR_API_KEY (or use same as above)SMTP_PASS=

- Use HTTPS

- Configure CORS for your domain- Find common ground and compromise

- Rotate API keys regularly

- Make concessions when appropriate```MAIL_FROM=a2mp@example.com

**Build:**

```bash- Propose integrated solutions

npm run build

npm run start- Support valid points from others

```



**Database Backup:**

```bash---### 3. Run Development Server# Engine

cp backend/backend/data/a2mp.db backups/a2mp-$(date +%Y%m%d).db

```



---## Configuration```bashENGINE_TICK_MS=8000



## Development



**Scripts:**Create `backend/.env` with your settings. See `backend/.env.example` for a complete template.npm run dev```

```bash

npm run dev     # Run backend + frontend

npm run build   # Build for production

npm run start   # Start production### Required Settings```Notes:

npm run format  # Format with Prettier

```



**Structure:**```bash- Email settings are optional in development. Without SMTP, invites are logged.

- `backend/src/services/` - Business logic

- `backend/src/llm/` - Gemini integration# Google Gemini API Keys (REQUIRED)

- `frontend/src/pages/` - UI components

- `check-*.js` - Debugging utilitiesGEMINI_API_KEY=your-api-key-hereThis starts:- Default `HOST_PASSWORD` is `password` if not set; change it for anything public.



---GEMINI_MODERATOR_API_KEY=your-moderator-api-key-here



## Tech Stack```- 🔧 Backend API on `http://localhost:4000`



- **Backend**: Node.js, Express, TypeScript, SQLite

- **Frontend**: React, TypeScript, Vite

- **AI**: Google Gemini 2.5 Flash### Server Configuration- 🎨 Frontend UI on `http://localhost:5174`### Develop

- **Real-time**: Server-Sent Events + polling



---

```bashFrom the repo root:

## Rate Limiting

PORT=4000

Dual API key system provides better quota management:

- **Participant Key**: Persona generation/responses (250 req/day)CORS_ORIGIN=http://localhost:5174### 4. Create Your First Meeting```bash

- **Moderator Key**: Turn decisions/conclusions (250 req/day)

- **Total**: 500+ requests per day```

- **Limits**: 10 RPM, 250K TPM, 250 RPD per key

1. Open `http://localhost:5174`npm run dev

---

### Host Authentication

## License

2. Log in as host (default password: `password`)```

Proprietary. Evaluation only. See `LICENSE` for details.

```bash

---

HOST_PASSWORD=your-secure-password3. Create a meeting with 2 participantsThis runs:

Built with Google Gemini API, Express, React, Vite, TypeScript, and better-sqlite3.

JWT_SECRET=your-jwt-secret-key

```4. Share participant links- Backend on `http://localhost:4000`



### AI Model Settings5. Submit inputs as participants- Frontend on `http://localhost:5173`



```bash6. Watch the AI conversation unfold!

GEMINI_MODEL=gemini-2.5-flash

ENGINE_TICK_MS=15000Open the frontend, use “Host Login” with your `HOST_PASSWORD`, create a meeting, and share participant links from the UI. The engine advances turns automatically and produces a report.

MAX_TURNS_PER_MEETING=10

```---



### Email (Optional)### Build and run (production‑like)



```bash## How It Works```bash

SMTP_HOST=smtp.gmail.com

SMTP_PORT=587# build API and UI bundles

SMTP_USER=your-email@gmail.com

SMTP_PASS=your-app-password### 1. Persona Generationnpm run build

MAIL_FROM=noreply@yourdomain.com

```When a participant submits input, the system:# start only the backend API (serve your frontend separately)



See full configuration details in the `.env.example` file.- Analyzes their perspective and prioritiesnpm run start



---- Generates a unique AI persona with identity, objectives, and communication style```



## Usage Guide- Creates Model Context Protocol (MCP) instructions for the persona



### Creating a Meeting### Data storage



1. Log in as host### 2. Conversation Engine- SQLite database file for this implementation is created under `backend/backend/data/a2mp.db`.

2. Enter meeting subject and context

3. Add participant emailsThe engine runs on a timer (default: every 15 seconds):

4. Click "Create Meeting & Invite"

5. Participants submit via unique links- Checks for meetings in "running" status---

6. Meeting starts automatically

- Calls moderator to decide next speaker

### Watching Live

- Generates AI response from selected persona## Option B: Run server + web (alternative)

- **Host View**: See all turns, whiteboard, inject messages

- **Participant View**: Watch conversation after submission, inject when paused- Detects repetition patterns and pauses if stuckUse this pair if you prefer the consolidated API in `server/` and a separate `web/` UI.



### Human Interjection- Checks for natural conclusion points



- Meetings pause when conversation gets stuck### Install

- Host or participants can inject guidance

- Meeting resumes automatically after input### 3. Smart Turn-Taking```bash



---Moderator uses priority logic:npm install --prefix server



## API Endpoints1. **Direct Questions**: If AI asks another AI a question, let them respondnpm install --prefix web



### Meetings2. **First-Time Speakers**: Give everyone a chance before repeating```



- `POST /api/meetings` - Create meeting3. **Alternation**: Prefer switching speakers (A→B→A→B)

- `GET /api/meetings/:id/status` - Get status with conversation

- `POST /api/meetings/:id/inject` - Inject human message4. **Free Choice**: Any speaker if no constraints### Configure environment

- `POST /api/meetings/:id/advance` - Advance one turn (host)

Create `server/.env`:

### Participants

### 4. Collaboration```bash

- `GET /api/participant?token=xxx` - Get participant details

- `POST /api/participant/submit` - Submit inputAI personas are instructed to:PORT=8080



### Authentication- Build on others' ideasWEB_ORIGIN=http://localhost:5173



- `POST /api/auth/host/login` - Host login- Find common ground and compromiseBASE_URL=http://localhost:8080



### Real-time- Make concessions when appropriate



- `GET /api/meetings/:id/stream` - SSE for live updates- Propose integrated solutionsGEMINI_API_KEY=your-gemini-api-key



---- Support valid points from others



## Debugging ToolsSMTP_HOST=



```bash---SMTP_PORT=587

# View conversation

node check-conversation.js [meetingId]SMTP_USER=



# View report## ConfigurationSMTP_PASS=

node check-report.js [meetingId]

MAIL_FROM=no-reply@a2mp.local

# List meetings

node list-meetings.js## Configuration



# View databaseCreate `backend/.env` with your settings. See `backend/.env.example` for a complete template.

node check-db.js

```

# Check quota

node check-quota.jsCreate `web/.env` (optional; defaults shown):

```

### Required Settings```bash

---

```bashVITE_API_BASE=http://localhost:8080

## Troubleshooting

# Google Gemini API Keys (REQUIRED)```

### Meeting Not Starting

GEMINI_API_KEY=your-api-key-here

- Ensure all participants submitted

- Check: `node list-meetings.js`GEMINI_MODERATOR_API_KEY=your-moderator-api-key-here### Develop

- Verify engine logs (every 15 seconds)

```In two terminals:

### API Key Issues

```bash

- Verify keys at [Google AI Studio](https://makersuite.google.com/app/apikey)

- Check quota: `node check-quota.js`### Server Configurationnpm run dev --prefix server

- Both keys must be set

```bashnpm run dev --prefix web

### Personas Repeating

PORT=4000```

- Anti-repetition mechanisms included

- Try more diverse inputsCORS_ORIGIN=http://localhost:5174- API on `http://localhost:8080`

- Check conversation: `node check-conversation.js`

```- Web UI on `http://localhost:5173`

### No Report Generated



- Check: `node check-report.js [meetingId]`

- Verify meeting status is "completed"### Host Authentication### Data storage

- Review server logs

```bash- SQLite database file for this implementation is created under `server/data/a2mp.sqlite`.

---

HOST_PASSWORD=your-secure-password

## Production Deployment

JWT_SECRET=your-jwt-secret-key---

### Security

```

- Change `HOST_PASSWORD` to strong password

- Set unique `JWT_SECRET`## Common scripts

- Use HTTPS

- Configure CORS properly### AI Model SettingsFrom the repo root:

- Rotate API keys regularly

```bash- `npm run dev`: run `backend` and `frontend` together (concurrently)

### Build

GEMINI_MODEL=gemini-2.5-flash- `npm run start`: start only the `backend` API

```bash

npm run buildENGINE_TICK_MS=15000- `npm run build`: build `backend` and `frontend`

npm run start

```MAX_TURNS_PER_MEETING=10- `npm run format`: format repo with Prettier



### Database Backup```



```bashProject packages also expose their own `dev`, `build`, and `start` scripts.

cp backend/backend/data/a2mp.db backups/a2mp-$(date +%Y%m%d).db

```### Email (Optional)



---```bash## Notes and tips



## DevelopmentSMTP_HOST=smtp.gmail.com- Frontend (`frontend/`) uses a Vite dev proxy to `/api` → `http://localhost:4000` and `/socket.io` for realtime.



### ScriptsSMTP_PORT=587- The alternative `web/` UI targets the `server/` API and uses `VITE_API_BASE` to choose the backend origin.



```bashSMTP_USER=your-email@gmail.com- For production, set strong values for `HOST_PASSWORD` and `JWT_SECRET`, and configure SMTP if you want email delivery.

npm run dev          # Run backend + frontend

npm run build        # Build for productionSMTP_PASS=your-app-password

npm run start        # Start production build

npm run format       # Format with PrettierMAIL_FROM=noreply@yourdomain.com## License

```

```This software is proprietary and provided for demonstration/evaluation only. See `LICENSE` for details.

### Code Structure



- `backend/src/services/` - Business logicSee full configuration details in the `.env.example` file.

- `backend/src/llm/` - Gemini integration

- `frontend/src/pages/` - UI components---

- `check-*.js` - Debugging utilities

## Usage Guide

---

### Creating a Meeting

## Tech Stack

1. Log in as host

- **Backend**: Node.js, Express, TypeScript, SQLite2. Enter meeting subject and context

- **Frontend**: React, TypeScript, Vite3. Add participant emails

- **AI**: Google Gemini 2.5 Flash4. Click "Create Meeting & Invite"

- **Real-time**: Server-Sent Events + polling5. Participants submit via unique links

6. Meeting starts automatically

---

### Watching Live

## Rate Limiting

- **Host View**: See all turns, whiteboard, inject messages

Dual API key system for better quota management:- **Participant View**: Watch conversation after submission, inject when paused



- **Participant Key**: Persona generation/responses (250 req/day)### Human Interjection

- **Moderator Key**: Turn decisions/conclusions (250 req/day)

- **Total**: 500+ requests per day- Meetings pause when conversation gets stuck

- **Per Key**: 10 RPM, 250K TPM, 250 RPD- Host or participants can inject guidance

- Meeting resumes automatically after input

---

---

## License

## API Endpoints

Proprietary. Evaluation only. See `LICENSE` for details.

### Meetings

---- `POST /api/meetings` - Create meeting

- `GET /api/meetings/:id/status` - Get status with conversation

## Credits- `POST /api/meetings/:id/inject` - Inject human message

- `POST /api/meetings/:id/advance` - Advance one turn (host)

Built with Google Gemini API, Express, React, Vite, TypeScript, and better-sqlite3.

### Participants

---- `GET /api/participant?token=xxx` - Get participant details

- `POST /api/participant/submit` - Submit input

**Made with ❤️ for asynchronous collaboration**

### Authentication
- `POST /api/auth/host/login` - Host login

### Real-time
- `GET /api/meetings/:id/stream` - SSE for live updates

---

## Debugging Tools

View conversation:
```bash
node check-conversation.js [meetingId]
```

View report:
```bash
node check-report.js [meetingId]
```

List meetings:
```bash
node list-meetings.js
```

View database:
```bash
node check-db.js
```

Check quota:
```bash
node check-quota.js
```

---

## Troubleshooting

### Meeting Not Starting

Check that all participants have submitted:
```bash
node list-meetings.js
```

Verify engine logs run every 15 seconds in the terminal.

### API Key Issues

Verify your keys at [Google AI Studio](https://makersuite.google.com/app/apikey)

Check quota:
```bash
node check-quota.js
```

Both keys must be set in your `.env` file.

### Personas Repeating

Anti-repetition mechanisms are included. If personas still repeat, try:
- More diverse participant inputs
- Check conversation history:
  ```bash
  node check-conversation.js
  ```

### No Report Generated

Check the report:
```bash
node check-report.js [meetingId]
```

Verify meeting status is "completed" and review server logs for errors.

---

## Production Deployment

### Security Checklist

- Change `HOST_PASSWORD` to a strong password
- Set a unique `JWT_SECRET` (32+ random characters)
- Use HTTPS for all connections
- Configure CORS properly for your domain
- Rotate API keys regularly

### Build and Deploy

Build the project:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```

### Database Backup

Create daily backups:
```bash
cp backend/backend/data/a2mp.db backups/a2mp-backup-$(date +%Y%m%d).db
```

---

## Development

### Available Scripts

Run both backend and frontend:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start production build:
```bash
npm run start
```

Format code with Prettier:
```bash
npm run format
```

### Code Structure

- `backend/src/services/` - Business logic
- `backend/src/llm/` - Gemini integration
- `frontend/src/pages/` - UI components
- `check-*.js` - Debugging utilities

---

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQLite
- **Frontend**: React, TypeScript, Vite
- **AI**: Google Gemini 2.5 Flash
- **Real-time**: Server-Sent Events + polling

---

## Rate Limiting

Dual API key system for better quota management:

- **Participant Key**: Persona generation/responses (250 req/day)
- **Moderator Key**: Turn decisions/conclusions (250 req/day)
- **Total**: 500+ requests per day
- **Per Key**: 10 RPM, 250K TPM, 250 RPD

---

## License

Proprietary. Evaluation only. See `LICENSE` for details.

---

## Credits

Built with Google Gemini API, Express, React, Vite, TypeScript, and better-sqlite3.

---

**Made with ❤️ for asynchronous collaboration**
