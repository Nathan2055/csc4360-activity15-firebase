const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

const meetingId = 'mtg_144f3854-8487-4aa4-9445-765802949d5e';

console.log('\n=== Participant Inputs ===\n');
const inputs = db.prepare(`
  SELECT pi.*, p.email 
  FROM participant_inputs pi 
  JOIN participants p ON p.id = pi.participantId 
  WHERE p.meetingId = ?
`).all(meetingId);

inputs.forEach(i => {
  console.log(`${i.email}:`);
  console.log(i.content);
  console.log('\n' + '='.repeat(60) + '\n');
});

db.close();
