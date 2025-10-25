const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

console.log('⚠️  WARNING: This will delete ALL data from the database!');
console.log('');

// Count records before deletion
const meetings = db.prepare('SELECT COUNT(*) as count FROM meetings').get();
const personas = db.prepare('SELECT COUNT(*) as count FROM personas').get();
const participants = db.prepare('SELECT COUNT(*) as count FROM participants').get();
const inputs = db.prepare('SELECT COUNT(*) as count FROM participant_inputs').get();
const turns = db.prepare('SELECT COUNT(*) as count FROM conversation_turns').get();
const reports = db.prepare('SELECT COUNT(*) as count FROM reports').get();

console.log('Current database contents:');
console.log(`  - ${meetings.count} meetings`);
console.log(`  - ${personas.count} personas`);
console.log(`  - ${participants.count} participants`);
console.log(`  - ${inputs.count} participant inputs`);
console.log(`  - ${turns.count} conversation turns`);
console.log(`  - ${reports.count} reports`);
console.log('');

// Delete all data (in correct order due to foreign keys)
console.log('Deleting all data...');

db.prepare('DELETE FROM reports').run();
console.log('✓ Deleted reports');

db.prepare('DELETE FROM conversation_turns').run();
console.log('✓ Deleted conversation turns');

db.prepare('DELETE FROM participant_inputs').run();
console.log('✓ Deleted participant inputs');

db.prepare('DELETE FROM participants').run();
console.log('✓ Deleted participants');

db.prepare('DELETE FROM personas').run();
console.log('✓ Deleted personas');

db.prepare('DELETE FROM meetings').run();
console.log('✓ Deleted meetings');

console.log('');
console.log('✅ Database cleared successfully!');
console.log('All tables are now empty.');

db.close();
