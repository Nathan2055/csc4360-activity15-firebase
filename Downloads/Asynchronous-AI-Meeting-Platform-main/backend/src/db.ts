import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "backend", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "a2mp.db"));

// Setup tables if not exist
export function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      details TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      status TEXT NOT NULL,
      whiteboard TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      meetingId TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      hasSubmitted INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS participant_inputs (
      id TEXT PRIMARY KEY,
      participantId TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(participantId) REFERENCES participants(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      meetingId TEXT NOT NULL,
      participantId TEXT,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      mcp TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS conversation_turns (
      id TEXT PRIMARY KEY,
      meetingId TEXT NOT NULL,
      speaker TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      metadata TEXT,
      FOREIGN KEY(meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      meetingId TEXT NOT NULL,
      summary TEXT NOT NULL,
      highlights TEXT NOT NULL,
      decisions TEXT NOT NULL,
      actionItems TEXT NOT NULL,
      visualMap TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(meetingId) REFERENCES meetings(id) ON DELETE CASCADE
    );
  `);
}
