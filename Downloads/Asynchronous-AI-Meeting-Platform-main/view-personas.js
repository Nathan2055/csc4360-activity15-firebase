const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

const meetingId = process.argv[2] || 'mtg_7ebaea69-feb2-4150-81ae-cccd3943e1c8';

console.log('\n=== Personas for Meeting ===\n');
const personas = db.prepare('SELECT * FROM personas WHERE meetingId = ?').all(meetingId);

personas.forEach(p => {
  console.log(`Name: ${p.name}`);
  console.log(`Role: ${p.role}`);
  console.log(`Participant ID: ${p.participantId || 'N/A'}`);
  console.log('---');
});

db.close();
