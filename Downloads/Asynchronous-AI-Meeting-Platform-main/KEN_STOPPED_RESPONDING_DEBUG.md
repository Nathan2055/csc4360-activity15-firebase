# Issue: Ken (BudgetOptimizer) Stopped Responding

## Problem Summary
Ken (BudgetOptimizer persona) only spoke once (turn 2) in a 10-turn conversation. The other AI persona "Decision Architect" dominated turns 1, 3-10.

## Root Cause Analysis

### What We Know:
1. **Meeting ID:** `mtg_7ebaea69-feb2-4150-81ae-cccd3943e1c8`
2. **Status:** Still "running" (hit 10-turn limit)
3. **Personas:**
   - Moderator (role: moderator)
   - Decision Architect (role: persona, Participant #1)
   - BudgetOptimizer aka Ken (role: persona, Participant #2)

### Conversation Pattern:
```
Turn 1:  Decision Architect (AI Persona #1)
Turn 2:  BudgetOptimizer (Ken - AI Persona #2) ✅ Only time Ken spoke
Turn 3:  Decision Architect
Turn 4:  Decision Architect
Turn 5:  Decision Architect
Turn 6:  Decision Architect
Turn 7:  Decision Architect
Turn 8:  Decision Architect
Turn 9:  Decision Architect
Turn 10: Decision Architect
```

### The Issue:
The moderator keeps selecting "Decision Architect" over and over instead of alternating between the two AI personas. This means:
- Ken provided his budget concerns in turn 2
- The moderator should have alternated back to Ken multiple times
- Instead, Decision Architect kept responding to itself

### Why This Happened:
The `moderatorDecideNext` function receives:
- List of participants with their emails
- Whether each has spoken (`hasSpoken` flag)
- Recent conversation history

**Hypothesis:** The moderator is either:
1. **Returning the wrong email/identifier** that doesn't match Ken's participant email
2. **Getting confused by the prompt** and repeatedly selecting the same persona
3. **Bug in participant matching logic** where Decision Architect's email keeps getting matched

### Key Code Location:
`backend/src/services/conversationService.ts` lines 113-120:
```typescript
const participantOptions = inputs.map(input => {
  const participant = db.prepare("SELECT email FROM participants WHERE id = ?")
    .get(input.participantId) as { email: string } | undefined;
  const personaName = personas.find(p => p.participantId === input.participantId)?.name;
  const hasSpoken = personaName ? history.some(turn => turn.speaker === `AI:${personaName}`) : false;
  return {
    email: participant?.email || 'Unknown',
    participantId: input.participantId,
    hasSpoken
  };
});
```

## Debugging Steps Needed:

### 1. Check Backend Logs
Look for console.log outputs showing:
```
[Gemini] moderatorDecideNext raw response: ...
```

This will show what the moderator is actually deciding. Should see JSON like:
```json
{"nextSpeaker":"email@example.com","moderatorNotes":"...","whiteboardUpdate":{...}}
```

### 2. Check Participant Emails
```bash
node -e "const db = require('./backend/node_modules/better-sqlite3')('./backend/backend/data/a2mp.db'); db.prepare('SELECT email, id FROM participants WHERE meetingId = ?').all('mtg_7ebaea69-feb2-4150-81ae-cccd3943e1c8').forEach(p => console.log(p)); db.close();"
```

### 3. Add Enhanced Logging
Add to `conversationService.ts` after moderator decision:
```typescript
console.log('[DEBUG] Moderator selected:', decision.nextSpeaker);
console.log('[DEBUG] Available options:', participantOptions.map(p => `${p.email} (spoken: ${p.hasSpoken})`));
console.log('[DEBUG] Matched participant:', selectedOption);
```

## Potential Fixes:

### Fix 1: Improve Moderator Prompt Clarity
The current prompt at `gemini.ts` line 236 says:
```
Pick from: email1, email2
```

**Problem:** Emails might not be clear identifiers. Should use persona names instead:

```typescript
const instruction = `Pick next speaker by EMAIL:
${notSpoken.map(p => `- ${p.email} (persona: ${getPersonaName(p)})`).join('\n')}`;
```

### Fix 2: Add Fairness Check
Before accepting moderator's decision, verify it's not the same speaker too many times:

```typescript
// After getting decision.nextSpeaker
const recentSpeakers = history.slice(-5).map(t => t.speaker);
const selectedPersonaName = personas.find(p => p.participantId === selectedOption.participantId)?.name;
const recentOccurrences = recentSpeakers.filter(s => s === `AI:${selectedPersonaName}`).length;

if (recentOccurrences >= 3) {
  console.warn(`[ConversationService] ${selectedPersonaName} spoke 3+ times in last 5 turns - forcing alternation`);
  // Force selection of different persona
  const otherOptions = participantOptions.filter(p => p.email !== decision.nextSpeaker);
  if (otherOptions.length > 0) {
    // Override with different speaker
    selectedOption = otherOptions[0];
  }
}
```

### Fix 3: Simplify Moderator Decision Logic
Instead of asking moderator to pick, implement round-robin:
```typescript
// After checking hasSpoken flags
const notSpoken = participantOptions.filter(p => !p.hasSpoken);
if (notSpoken.length > 0) {
  // Pick first person who hasn't spoken
  selectedOption = notSpoken[0];
} else {
  // Round robin through all participants
  const lastSpeaker = history[history.length - 1].speaker;
  const lastPersonaId = personas.find(p => `AI:${p.name}` === lastSpeaker)?.participantId;
  const currentIndex = participantOptions.findIndex(p => p.participantId === lastPersonaId);
  const nextIndex = (currentIndex + 1) % participantOptions.length;
  selectedOption = participantOptions[nextIndex];
}
```

## Immediate Action:
1. Check backend terminal for moderator decision logs
2. Cancel current meeting: `UPDATE meetings SET status = 'cancelled' WHERE id = 'mtg_7ebaea69-feb2-4150-81ae-cccd3943e1c8'`
3. Implement Fix #2 (fairness check) to prevent same speaker dominating
4. Start new meeting and monitor

## Expected Behavior:
Conversation should alternate like:
```
Turn 1: Persona A
Turn 2: Persona B
Turn 3: Persona A
Turn 4: Persona B
...
```

Not:
```
Turn 1: Persona A
Turn 2: Persona B
Turn 3-10: Persona A (WRONG!)
```
