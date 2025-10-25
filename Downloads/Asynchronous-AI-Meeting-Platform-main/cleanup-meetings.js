const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

console.log('\n=== Cleaning up old/incomplete meetings ===\n');

// Find the meeting with 2/2 personas ready
const meetings = db.prepare(`
  SELECT m.id, m.status,
         (SELECT COUNT(*) FROM personas WHERE meetingId = m.id AND role = 'persona') as personaCount,
         (SELECT COUNT(*) FROM participant_inputs pi 
          JOIN participants p ON p.id = pi.participantId 
          WHERE p.meetingId = m.id) as inputCount
  FROM meetings m
  WHERE m.status = 'running'
  ORDER BY m.createdAt DESC
`).all();

console.log('Running meetings:');
meetings.forEach(m => {
  console.log(`- ${m.id.substring(0, 25)}... Personas: ${m.personaCount}/${m.inputCount}`);
});

// Find the one with all personas ready
const readyMeeting = meetings.find(m => m.personaCount > 0 && m.personaCount === m.inputCount);

if (readyMeeting) {
  console.log(`\nKeeping meeting with personas ready: ${readyMeeting.id}`);
  
  // Cancel all other running meetings
  const result = db.prepare(`
    UPDATE meetings 
    SET status = 'cancelled' 
    WHERE status = 'running' AND id != ?
  `).run(readyMeeting.id);
  
  console.log(`Cancelled ${result.changes} incomplete meeting(s)`);
} else {
  console.log('\nNo meeting found with all personas ready. Cancelling all running meetings.');
  db.prepare(`UPDATE meetings SET status = 'cancelled' WHERE status = 'running'`).run();
}

// Show final state
const allMeetings = db.prepare('SELECT id, status FROM meetings ORDER BY createdAt DESC').all();
console.log('\nFinal meeting statuses:');
allMeetings.forEach((m, i) => {
  console.log(`${i + 1}. ${m.id.substring(0, 25)}... - ${m.status}`);
});

db.close();
console.log('\n✅ Cleanup complete!\n');
