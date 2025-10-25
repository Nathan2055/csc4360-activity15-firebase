const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

console.log('\n=== Meetings with Most Conversation ===\n');

const meetings = db.prepare(`
  SELECT 
    m.id, 
    m.subject, 
    m.status, 
    m.createdAt,
    (SELECT COUNT(*) FROM conversation_turns WHERE meetingId = m.id) as turns,
    (SELECT COUNT(*) FROM personas WHERE meetingId = m.id AND role = 'persona') as personas
  FROM meetings m
  WHERE status IN ('completed', 'active')
  ORDER BY turns DESC, createdAt DESC
  LIMIT 10
`).all();

meetings.forEach(m => {
  console.log(`ID: ${m.id.substring(0, 20)}...`);
  console.log(`Subject: ${m.subject}`);
  console.log(`Status: ${m.status}`);
  console.log(`Turns: ${m.turns}`);
  console.log(`Personas: ${m.personas}`);
  console.log(`Created: ${new Date(m.createdAt).toLocaleString()}`);
  console.log('---\n');
});

db.close();
