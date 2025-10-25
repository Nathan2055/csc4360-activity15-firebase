import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { upsertMeeting, insertParticipant, updateParticipantInput, getParticipantByInvite, getParticipantsByMeeting, getMeetingById, insertTurn, listTurns } from './db.js';
import { sendInviteMail } from './email.js';
import { addClient, broadcastStatus, broadcastTurn } from './sse.js';
import { initializeConversation, runTurnLoop, pause, resume, getState } from './conversation.js';
import { ensureReport } from './report.js';
import type { ConversationTurn, Meeting, Participant } from './types.js';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

const PORT = Number(process.env.PORT || 8080);
const WEB_ORIGIN = process.env.WEB_ORIGIN || `http://localhost:5173`;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Create meeting
app.post('/api/meetings', async (req, res) => {
  const schema = z.object({ subject: z.string().min(1), details: z.string().min(1), participants: z.array(z.string().email()).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const id = nanoid();
  const meeting: Meeting = { id, subject: parsed.data.subject, details: parsed.data.details, createdAt: Date.now(), status: 'pending' };
  upsertMeeting.run(meeting);
  const invites: Participant[] = parsed.data.participants.map((email) => ({ id: nanoid(), meetingId: id, email, inviteCode: nanoid(12) }));
  for (const p of invites) insertParticipant.run(p);

  // email invites
  for (const p of invites) {
    const url = `${WEB_ORIGIN}/p/${p.inviteCode}`;
    sendInviteMail({ to: p.email, meetingSubject: meeting.subject, inviteUrl: url }).catch(()=>{});
  }

  res.json({ meetingId: id, invites: invites.map((p) => ({ email: p.email, url: `${WEB_ORIGIN}/p/${p.inviteCode}` })) });
});

// Participant view
app.get('/api/invite/:code', (req, res) => {
  const p: any = getParticipantByInvite(req.params.code);
  if (!p) return res.status(404).json({ error: 'Invite not found' });
  const m: any = getMeetingById(p.meetingId);
  res.json({ meeting: m, participant: { id: p.id, email: p.email } });
});

// Submit initial input
app.post('/api/participant/:id/input', (req, res) => {
  const schema = z.object({ input: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  updateParticipantInput.run({ id: req.params.id, initialInput: parsed.data.input, submittedAt: Date.now() });
  res.json({ ok: true });
});

// Start conversation if all inputs received
app.post('/api/meetings/:id/start', async (req, res) => {
  const meetingId = req.params.id;
  const participants = getParticipantsByMeeting(meetingId) as any[];
  if (!participants.length) return res.status(400).json({ error: 'No participants' });
  const allSubmitted = participants.every((p) => !!p.initialInput);
  if (!allSubmitted) return res.status(400).json({ error: 'Waiting for inputs' });
  await initializeConversation(meetingId);
  runTurnLoop(meetingId, () => getState(meetingId)?.status === 'completed');
  res.json({ started: true });
});

// Inject human message
app.post('/api/meetings/:id/inject', (req, res) => {
  const schema = z.object({ author: z.string().min(1), message: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const turn: ConversationTurn = { id: nanoid(), meetingId: req.params.id, role: 'human', speaker: parsed.data.author, content: parsed.data.message, createdAt: Date.now() };
  insertTurn.run(turn);
  broadcastTurn(turn);
  res.json({ ok: true });
});

// Pause / Resume
app.post('/api/meetings/:id/pause', (req, res) => { pause(req.params.id); res.json({ ok: true }); });
app.post('/api/meetings/:id/resume', (req, res) => { resume(req.params.id); res.json({ ok: true }); });

// SSE stream
app.get('/api/meetings/:id/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  addClient(req.params.id, res);
  res.write(`event: ping\n`);
  res.write(`data: {"ok":true}\n\n`);
});

// List conversation
app.get('/api/meetings/:id/turns', (req, res) => {
  const turns = listTurns(req.params.id);
  res.json(turns);
});

// Generate / fetch report
app.get('/api/meetings/:id/report', async (req, res) => {
  const report = await ensureReport(req.params.id);
  res.json(report);
});

app.listen(PORT, () => {
  console.log(`A²MP server listening on http://localhost:${PORT}`);
  console.log(`Frontend origin set to ${WEB_ORIGIN}`);
});
