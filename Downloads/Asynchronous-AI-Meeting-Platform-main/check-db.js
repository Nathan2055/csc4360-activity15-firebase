const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

const meetingId = 'mtg_144f3854-8487-4aa4-9445-765802949d5e';

console.log('\n=== Meeting Participants ===');
const participants = db.prepare('SELECT * FROM participants WHERE meetingId = ?').all(meetingId);
console.log(`Total participants: ${participants.length}`);
participants.forEach(p => {
  console.log(`- ${p.email} (ID: ${p.id}, hasSubmitted: ${p.hasSubmitted})`);
});

console.log('\n=== Participant Inputs ===');
const inputs = db.prepare(`
  SELECT pi.*, p.email 
  FROM participant_inputs pi 
  JOIN participants p ON p.id = pi.participantId 
  WHERE p.meetingId = ?
`).all(meetingId);
console.log(`Total inputs submitted: ${inputs.length}`);
inputs.forEach(i => {
  console.log(`- ${i.email}: ${i.content.substring(0, 50)}...`);
});

console.log('\n=== Personas ===');
const personas = db.prepare('SELECT * FROM personas WHERE meetingId = ?').all(meetingId);
console.log(`Total personas: ${personas.length}`);
personas.forEach(p => {
  console.log(`- ${p.name} (role: ${p.role})`);
});

db.close();
