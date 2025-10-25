const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

const meetingId = 'mtg_fac5cd2a-65e3-4b22-8724-c9c6584d8c7b';

console.log('Cleaning up duplicate inputs...\n');

// Get all inputs
const inputs = db.prepare(`
  SELECT pi.id, pi.participantId, pi.createdAt, p.email 
  FROM participant_inputs pi 
  JOIN participants p ON p.id = pi.participantId 
  WHERE p.meetingId = ?
  ORDER BY pi.createdAt
`).all(meetingId);

console.log(`Found ${inputs.length} inputs:`);
inputs.forEach((i, idx) => {
  console.log(`${idx + 1}. ${i.email} at ${new Date(i.createdAt).toISOString()} (ID: ${i.id})`);
});

// Keep only the first input for each participant
const participantFirstInput = {};
const inputsToDelete = [];

inputs.forEach(input => {
  if (!participantFirstInput[input.participantId]) {
    participantFirstInput[input.participantId] = input.id;
    console.log(`\nKeeping first input for ${input.email}: ${input.id}`);
  } else {
    inputsToDelete.push(input.id);
    console.log(`Marking for deletion (duplicate for ${input.email}): ${input.id}`);
  }
});

if (inputsToDelete.length > 0) {
  console.log(`\nDeleting ${inputsToDelete.length} duplicate input(s)...`);
  const deleteStmt = db.prepare('DELETE FROM participant_inputs WHERE id = ?');
  inputsToDelete.forEach(id => {
    deleteStmt.run(id);
    console.log(`Deleted: ${id}`);
  });
  
  console.log('\n✅ Cleanup complete!');
} else {
  console.log('\nNo duplicates found.');
}

// Show final state
const remaining = db.prepare(`
  SELECT COUNT(*) as count 
  FROM participant_inputs pi 
  JOIN participants p ON p.id = pi.participantId 
  WHERE p.meetingId = ?
`).get(meetingId);

console.log(`\nFinal state: ${remaining.count} input(s) remaining`);

db.close();
