const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

const meetingId = process.argv[2] || 'mtg_2fd351c3-5dcd-42cd-8943-76b78c5f2ef5';

console.log('\n=== Meeting Conversation ===');
const turns = db.prepare(`
  SELECT speaker, message, createdAt 
  FROM conversation_turns 
  WHERE meetingId = ? 
  ORDER BY createdAt ASC
`).all(meetingId);

console.log(`Total turns: ${turns.length}\n`);

turns.forEach((t, i) => {
  const time = new Date(t.createdAt).toLocaleTimeString();
  console.log(`[${i + 1}] ${time} - ${t.speaker}:`);
  console.log(`    ${t.message.substring(0, 150)}${t.message.length > 150 ? '...' : ''}`);
  console.log();
});

// Check personas
console.log('=== Personas ===');
const personas = db.prepare('SELECT name, role FROM personas WHERE meetingId = ?').all(meetingId);
personas.forEach(p => console.log(`- ${p.name} (${p.role})`));

db.close();
