const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

console.log('\n=== Recent Meetings ===');
const meetings = db.prepare('SELECT id, subject, status FROM meetings ORDER BY createdAt DESC LIMIT 10').all();
meetings.forEach(m => {
  console.log(`\nID: ${m.id}`);
  console.log(`Subject: ${m.subject}`);
  console.log(`Status: ${m.status}`);
  
  const personas = db.prepare('SELECT COUNT(*) as count FROM personas WHERE meetingId = ? AND role = ?').get(m.id, 'persona');
  const inputs = db.prepare(`
    SELECT COUNT(*) as count 
    FROM participant_inputs pi 
    JOIN participants p ON p.id = pi.participantId 
    WHERE p.meetingId = ?
  `).get(m.id);
  
  console.log(`Personas: ${personas.count}/${inputs.count} ready`);
});

db.close();
