import { db } from "../db.js";
import { generateId, now, toJson } from "../util.js";
import { Meeting, Participant, Whiteboard } from "../types.js";

export function createMeeting(subject: string, details: string, participantEmails: string[]): Meeting & { participants: Participant[] } {
  // Cancel all previous meetings before creating a new one
  const cancelledCount = db.prepare("UPDATE meetings SET status = 'cancelled' WHERE status != 'cancelled'").run().changes;
  if (cancelledCount > 0) {
    console.log(`[MeetingService] Cancelled ${cancelledCount} previous meeting(s) before creating new meeting`);
  }
  
  const meeting: Meeting = {
    id: generateId("mtg"),
    subject,
    details,
    createdAt: now(),
    status: "awaiting_inputs",
    whiteboard: { keyFacts: [], decisions: [], actionItems: [] }
  };
  db.prepare("INSERT INTO meetings (id, subject, details, createdAt, status, whiteboard) VALUES (?, ?, ?, ?, ?, ?)")
    .run(meeting.id, meeting.subject, meeting.details, meeting.createdAt, meeting.status, toJson(meeting.whiteboard));

  const insertP = db.prepare("INSERT INTO participants (id, meetingId, email, token, hasSubmitted, createdAt) VALUES (?, ?, ?, ?, ?, ?)");
  const participants: Participant[] = participantEmails.map((email) => {
    const part: Participant = {
      id: generateId("prt"),
      meetingId: meeting.id,
      email,
      token: generateId("tok"),
      hasSubmitted: false,
      createdAt: now()
    };
    insertP.run(part.id, part.meetingId, part.email, part.token, part.hasSubmitted ? 1 : 0, part.createdAt);
    return part;
  });

  return { ...meeting, participants };
}

export function getMeeting(meetingId: string): Meeting & { participants: Participant[] } {
  const row = db.prepare("SELECT * FROM meetings WHERE id = ?").get(meetingId) as any;
  if (!row) throw new Error("Meeting not found");
  const participants = db.prepare("SELECT * FROM participants WHERE meetingId = ?").all(meetingId) as Participant[];
  const meeting: Meeting = {
    id: row.id,
    subject: row.subject,
    details: row.details,
    createdAt: row.createdAt,
    status: row.status,
    whiteboard: JSON.parse(row.whiteboard) as Whiteboard
  };
  return { ...meeting, participants };
}
