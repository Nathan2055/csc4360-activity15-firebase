const Database = require('./backend/node_modules/better-sqlite3');
const crypto = require('crypto');

const db = new Database('./backend/backend/data/a2mp.db');

// Generate IDs
const meetingId = 'mtg_' + crypto.randomUUID();
const now = Date.now();

console.log('Creating test meeting...');

// Initialize whiteboard
const whiteboard = {
  keyFacts: [],
  decisions: [],
  actionItems: []
};

// Create meeting
db.prepare(`
  INSERT INTO meetings (id, subject, details, createdAt, status, whiteboard)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(
  meetingId,
  'Product Roadmap Priorities for Q1 2026',
  'We need to decide which features to prioritize given limited engineering resources. Consider user feedback, market trends, technical feasibility, and business impact.',
  now,
  'running',
  JSON.stringify(whiteboard)
);

console.log(`✓ Meeting created: ${meetingId}`);

// Add participants with diverse inputs
const participants = [
  {
    name: 'Alice Chen',
    email: 'alice@example.com',
    input: 'I think we should prioritize the mobile app redesign. Our mobile users make up 65% of our traffic but have the lowest engagement rates. User feedback consistently mentions the app feels outdated and clunky.'
  },
  {
    name: 'Bob Martinez',
    email: 'bob@example.com',
    input: 'From an engineering perspective, I believe we need to focus on API performance improvements. Our backend is struggling with scale, and fixing this foundation will enable all future features. Plus, it\'s blocking the mobile team.'
  },
  {
    name: 'Carol Johnson',
    email: 'carol@example.com',
    input: 'The customer success team is overwhelmed with requests for better analytics and reporting tools. Enterprise clients are threatening to churn without this. It\'s a revenue retention issue that needs immediate attention.'
  }
];

participants.forEach(p => {
  const participantId = 'prt_' + crypto.randomUUID();
  const token = crypto.randomUUID();
  
  // Add participant
  db.prepare(`
    INSERT INTO participants (id, meetingId, email, token, hasSubmitted, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(participantId, meetingId, p.email, token, 1, now);
  
  // Add participant input
  db.prepare(`
    INSERT INTO participant_inputs (id, participantId, content, createdAt)
    VALUES (?, ?, ?, ?)
  `).run('inp_' + crypto.randomUUID(), participantId, p.input, now);
  
  console.log(`✓ Added participant: ${p.name} (${p.email})`);
});

// Add personas (moderator + 3 participant personas)
console.log('\nGenerating personas...');

// Moderator
const moderatorId = 'per_' + crypto.randomUUID();
const moderatorMCP = {
  goal: 'Facilitate a productive discussion about Q1 2026 product roadmap priorities',
  context: 'Engineering resources are limited. Need to balance user feedback, market trends, and technical feasibility.',
  constraints: ['Ensure all perspectives are heard', 'Drive toward actionable decisions', 'Identify conflicts and areas of agreement']
};

db.prepare(`
  INSERT INTO personas (id, meetingId, participantId, role, name, mcp, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(moderatorId, meetingId, null, 'moderator', 'Moderator', JSON.stringify(moderatorMCP), now);

console.log('✓ Added Moderator');

// Participant personas
const personaData = [
  {
    participantId: participants[0].email,  // Alice
    name: 'Alex Rivera',
    mcp: {
      goal: 'Advocate for mobile app redesign to improve engagement',
      context: 'Mobile users are 65% of traffic but have lowest engagement. App feedback is consistently negative.',
      constraints: ['Must show ROI', 'Need to address user pain points', 'Consider development timeline']
    }
  },
  {
    participantId: participants[1].email,  // Bob
    name: 'Morgan Chen',
    mcp: {
      goal: 'Push for API performance improvements as foundation',
      context: 'Backend scalability issues blocking multiple teams. Technical debt accumulating.',
      constraints: ['Engineering capacity is limited', 'Must consider long-term impact', 'Need to unblock other features']
    }
  },
  {
    participantId: participants[2].email,  // Carol
    name: 'Jordan Lee',
    mcp: {
      goal: 'Prioritize analytics and reporting for enterprise retention',
      context: 'Enterprise clients threatening to churn. Customer success team overwhelmed with requests.',
      constraints: ['Revenue retention is critical', 'Must deliver quickly', 'Enterprise requirements are complex']
    }
  }
];

// Find participant IDs
const participantIds = participants.map(p => {
  const participant = db.prepare('SELECT id FROM participants WHERE meetingId = ? AND email = ?')
    .get(meetingId, p.email);
  return participant;
});

personaData.forEach((pd, i) => {
  const personaId = 'per_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO personas (id, meetingId, participantId, role, name, mcp, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(personaId, meetingId, participantIds[i].id, 'persona', pd.name, JSON.stringify(pd.mcp), now);
  console.log(`✓ Added persona: ${pd.name}`);
});

console.log('\n✅ Test meeting created successfully!');
console.log(`\nMeeting ID: ${meetingId}`);
console.log('Subject: Product Roadmap Priorities for Q1 2026');
console.log('Participants: 3');
console.log('Status: waiting (personas will be generated)');
console.log('\nThe backend will automatically:');
console.log('1. Generate 3 AI personas based on participant inputs');
console.log('2. Start the meeting when all personas are ready');
console.log('3. Run up to 25 conversation turns');
console.log('\nMonitor progress with:');
console.log(`  node check-conversation.js ${meetingId}`);

db.close();
