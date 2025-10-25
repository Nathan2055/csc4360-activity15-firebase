/**
 * Check the last meeting's status and conversation
 * Run: node check-last-meeting.js
 */

import Database from 'better-sqlite3';

const db = new Database('./backend/backend/a2mp.db');

// Get the most recent meeting
const meeting = db.prepare(`
  SELECT * FROM meetings 
  ORDER BY createdAt DESC 
  LIMIT 1
`).get();

if (!meeting) {
  console.log('❌ No meetings found in database');
  process.exit(0);
}

console.log('📋 Last Meeting:');
console.log(`   ID: ${meeting.id}`);
console.log(`   Subject: ${meeting.subject}`);
console.log(`   Status: ${meeting.status}`);
console.log(`   Created: ${new Date(meeting.createdAt).toLocaleString()}\n`);

// Get participants
const participants = db.prepare(`
  SELECT p.*, pi.content as input, pi.hasSubmitted
  FROM participants p
  LEFT JOIN participant_inputs pi ON p.id = pi.participantId
  WHERE p.meetingId = ?
`).all(meeting.id);

console.log(`👥 Participants (${participants.length}):`);
participants.forEach(p => {
  console.log(`   - ${p.email}: ${p.hasSubmitted ? '✅ Submitted' : '❌ Not submitted'}`);
  if (p.input) {
    console.log(`     Input: ${p.input.substring(0, 100)}...`);
  }
});
console.log();

// Get personas
const personas = db.prepare(`
  SELECT * FROM personas WHERE meetingId = ?
`).all(meeting.id);

console.log(`🤖 Personas (${personas.length}):`);
personas.forEach(p => {
  console.log(`   - ${p.name} (${p.role})`);
  if (p.participantId) {
    const participant = participants.find(pp => pp.id === p.participantId);
    if (participant) {
      console.log(`     For: ${participant.email}`);
    }
  }
});
console.log();

// Get conversation
const turns = db.prepare(`
  SELECT * FROM conversation_turns 
  WHERE meetingId = ? 
  ORDER BY createdAt
`).all(meeting.id);

console.log(`💬 Conversation (${turns.length} turns):`);
if (turns.length === 0) {
  console.log('   No conversation yet\n');
} else {
  turns.forEach((turn, idx) => {
    console.log(`   ${idx + 1}. [${turn.speaker}]:`);
    console.log(`      ${turn.message.substring(0, 120)}${turn.message.length > 120 ? '...' : ''}`);
  });
  console.log();
}

// Get whiteboard
if (meeting.whiteboard) {
  const wb = JSON.parse(meeting.whiteboard);
  console.log('📊 Whiteboard:');
  console.log(`   Key Facts: ${wb.keyFacts?.length || 0}`);
  wb.keyFacts?.forEach(f => console.log(`     - ${f}`));
  console.log(`   Decisions: ${wb.decisions?.length || 0}`);
  wb.decisions?.forEach(d => console.log(`     - ${d}`));
  console.log(`   Action Items: ${wb.actionItems?.length || 0}`);
  wb.actionItems?.forEach(a => console.log(`     - ${a}`));
  console.log();
}

// Get report if exists
const report = db.prepare(`
  SELECT * FROM reports WHERE meetingId = ?
`).get(meeting.id);

if (report) {
  console.log('📄 Report Generated:');
  console.log(`   ID: ${report.id}`);
  console.log(`   Summary: ${report.summary.substring(0, 150)}...`);
  console.log(`   Highlights: ${JSON.parse(report.highlights).length}`);
  console.log(`   Decisions: ${JSON.parse(report.decisions).length}`);
  console.log(`   Action Items: ${JSON.parse(report.actionItems).length}`);
} else {
  console.log('📄 No report generated yet');
}

db.close();
