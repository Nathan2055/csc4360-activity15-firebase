const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/backend/data/a2mp.db');

const meetingId = process.argv[2] || 'mtg_2fd351c3-5dcd-42cd-8943-76b78c5f2ef5';

console.log('\n=== Meeting Report ===');
const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId);

if (!meeting) {
  console.log('Meeting not found!');
  process.exit(1);
}

console.log(`Subject: ${meeting.subject}`);
console.log(`Status: ${meeting.status}`);
console.log(`Created: ${new Date(meeting.createdAt).toLocaleString()}`);
console.log(`Concluded: ${meeting.concludedAt ? new Date(meeting.concludedAt).toLocaleString() : 'N/A'}`);

console.log('\n=== Whiteboard ===');
if (meeting.whiteboard) {
  const whiteboard = JSON.parse(meeting.whiteboard);
  
  if (whiteboard.keyFacts && whiteboard.keyFacts.length > 0) {
    console.log('\n💡 Key Facts:');
    whiteboard.keyFacts.forEach((fact, i) => console.log(`  ${i + 1}. ${fact}`));
  } else {
    console.log('\n💡 Key Facts: (none)');
  }
  
  if (whiteboard.decisions && whiteboard.decisions.length > 0) {
    console.log('\n✅ Decisions:');
    whiteboard.decisions.forEach((decision, i) => console.log(`  ${i + 1}. ${decision}`));
  } else {
    console.log('\n✅ Decisions: (none)');
  }
  
  if (whiteboard.actionItems && whiteboard.actionItems.length > 0) {
    console.log('\n🎯 Action Items:');
    whiteboard.actionItems.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
  } else {
    console.log('\n🎯 Action Items: (none)');
  }
} else {
  console.log('No whiteboard data');
}

console.log('\n=== Final Report ===');
const report = db.prepare('SELECT * FROM reports WHERE meetingId = ?').get(meetingId);

if (report) {
  console.log('\n📄 Summary:');
  console.log(report.summary || 'No summary available');
  
  if (report.highlights) {
    const highlights = JSON.parse(report.highlights);
    if (highlights.length > 0) {
      console.log('\n✨ Highlights:');
      highlights.forEach((highlight, i) => console.log(`  ${i + 1}. ${highlight}`));
    }
  }
  
  if (report.decisions) {
    const decisions = JSON.parse(report.decisions);
    if (decisions.length > 0) {
      console.log('\n✅ Decisions Made:');
      decisions.forEach((decision, i) => console.log(`  ${i + 1}. ${decision}`));
    }
  }
  
  if (report.actionItems) {
    const actionItems = JSON.parse(report.actionItems);
    if (actionItems.length > 0) {
      console.log('\n🎯 Action Items:');
      actionItems.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    }
  }
  
  console.log(`\n📅 Report Generated: ${new Date(report.createdAt).toLocaleString()}`);
} else {
  console.log('No report generated yet');
}

// Check conversation turns
console.log('\n=== Conversation Summary ===');
const turns = db.prepare(`
  SELECT COUNT(*) as count, 
         MIN(createdAt) as first, 
         MAX(createdAt) as last
  FROM conversation_turns 
  WHERE meetingId = ?
`).get(meetingId);

console.log(`Total turns: ${turns.count}`);
console.log(`First turn: ${new Date(turns.first).toLocaleString()}`);
console.log(`Last turn: ${new Date(turns.last).toLocaleString()}`);

db.close();
