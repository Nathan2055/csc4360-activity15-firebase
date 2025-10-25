import Database from 'better-sqlite3';
import { UUID, Meeting, Participant, ConversationTurn, Report } from './types.js';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const dbFile = join(dataDir, 'a2mp.sqlite');
export const db = new Database(dbFile);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  meetingId TEXT NOT NULL,
  email TEXT NOT NULL,
  inviteCode TEXT NOT NULL UNIQUE,
  initialInput TEXT,
  submittedAt INTEGER,
  FOREIGN KEY(meetingId) REFERENCES meetings(id)
);

CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  meetingId TEXT NOT NULL,
  role TEXT NOT NULL,
  speaker TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY(meetingId) REFERENCES meetings(id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  meetingId TEXT NOT NULL,
  summary TEXT NOT NULL,
  highlights TEXT NOT NULL,
  decisions TEXT NOT NULL,
  actionItems TEXT NOT NULL,
  visualMapMermaid TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY(meetingId) REFERENCES meetings(id)
);
`);

export const upsertMeeting = db.prepare(`INSERT OR REPLACE INTO meetings (id, subject, details, createdAt, status) VALUES (@id, @subject, @details, @createdAt, @status)`);
export const insertParticipant = db.prepare(`INSERT INTO participants (id, meetingId, email, inviteCode) VALUES (@id, @meetingId, @email, @inviteCode)`);
export const updateParticipantInput = db.prepare(`UPDATE participants SET initialInput=@initialInput, submittedAt=@submittedAt WHERE id=@id`);
export const getParticipantsByMeeting = db.prepare(`SELECT * FROM participants WHERE meetingId=?`).all.bind(db.prepare(`SELECT * FROM participants WHERE meetingId=?`));
export const getMeetingById = db.prepare(`SELECT * FROM meetings WHERE id=?`).get.bind(db.prepare(`SELECT * FROM meetings WHERE id=?`));
export const getParticipantByInvite = db.prepare(`SELECT * FROM participants WHERE inviteCode=?`).get.bind(db.prepare(`SELECT * FROM participants WHERE inviteCode=?`));
export const insertTurn = db.prepare(`INSERT INTO turns (id, meetingId, role, speaker, content, createdAt) VALUES (@id, @meetingId, @role, @speaker, @content, @createdAt)`);
export const listTurns = db.prepare(`SELECT * FROM turns WHERE meetingId=? ORDER BY createdAt ASC`).all.bind(db.prepare(`SELECT * FROM turns WHERE meetingId=? ORDER BY createdAt ASC`));
export const insertReport = db.prepare(`INSERT INTO reports (id, meetingId, summary, highlights, decisions, actionItems, visualMapMermaid, createdAt) VALUES (@id, @meetingId, @summary, @highlights, @decisions, @actionItems, @visualMapMermaid, @createdAt)`);
export const getReportByMeeting = db.prepare(`SELECT * FROM reports WHERE meetingId=?`).get.bind(db.prepare(`SELECT * FROM reports WHERE meetingId=?`));
