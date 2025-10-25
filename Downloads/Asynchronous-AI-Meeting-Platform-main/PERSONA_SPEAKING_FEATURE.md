# Participant Speaks Through Persona Feature

## Overview
When participants inject messages into the conversation, their messages are attributed to **their AI persona** rather than appearing as separate "Human:" speakers. This creates a seamless conversation flow where participants can take direct control of their persona when needed.

## Problem Solved
Previously, when a participant injected a message:
- It appeared as `"Human:ParticipantName"` in the conversation
- AIs would respond TO the human, breaking the persona-based flow
- Created confusion about who is speaking (the persona or the human?)
- Disrupted the meeting's AI-driven conversation model

## New Behavior

### Participant Interjections
When a participant sends a message:
1. **System looks up their persona** by matching their email/name to participantId
2. **Message is attributed to their AI persona**: `"AI:PersonaName"`
3. **Appears in conversation** as if the persona itself is speaking
4. **Other AIs respond naturally** to the persona, not to a separate human

### Host Interjections
When the host sends a message:
- Appears as `"Human:Host"` (not changed)
- Retains the orange "Human" styling
- Clearly distinguishable as external moderator input
- AIs still respond to this as important guidance (via moderator prompt)

## Implementation Details

### Backend: Route Handler
Location: `backend/src/routes.ts` - `/api/meetings/:id/inject`

```typescript
// Find participant by email/name
const participant = db.prepare(
  "SELECT id FROM participants WHERE meetingId = ? AND email = ?"
).get(meetingId, author);

if (participant) {
  // Find their persona
  const persona = db.prepare(
    "SELECT name FROM personas WHERE meetingId = ? AND participantId = ?"
  ).get(meetingId, participant.id);
  
  if (persona) {
    // Attribute to persona
    speaker = `AI:${persona.name}`;
  }
} else {
  // Not a participant = must be host
  speaker = `Human:Host`;
}
```

**Logic Flow:**
1. Check if author matches a participant email in the meeting
2. If yes → Look up their persona name
3. If persona exists → Use `AI:PersonaName`
4. If no participant match → Assume host → Use `Human:Host`
5. If participant but no persona yet → Fallback to `Human:ParticipantName`

### Frontend: User Experience

#### Participant View
**Title Change:** "Speak Through Your Persona"
**Description:** 
- Normal: "You can take direct control of your AI persona at any time. Your message will appear as them speaking in the conversation."
- Paused: "Your input is needed to continue the conversation. Your message will appear as your AI persona speaking."

**Visual Indicators:**
- Blue box (normal operation)
- Orange box (when paused and input needed)
- Placeholder: "Speak as your persona..."

#### Host View
**Title:** "Host Interjection"
**Description:** "Add your input to guide the AI conversation. Your message will appear as 'Human:Host' in the conversation."

**Visual:**
- Orange box always
- Clearly marked as external host input

### Conversation Display

#### How Messages Appear:

**Participant Message (Sarah):**
```
🤖 Turn 8 - AI:Decision Facilitator (Sarah)
[Cyan background, AI styling]
I think we should prioritize option A for the first phase.
```

**Host Message:**
```
👤 Turn 9 - Human:Host
[Orange background, Human styling]
Let's make sure we consider budget constraints.
```

**Regular AI Message:**
```
🤖 Turn 10 - AI:Strategic Advisor (Mike)
[Cyan background, AI styling]
Good point. Based on Sarah's suggestion and the budget...
```

## Benefits

### 1. Seamless Conversation Flow
- No distinction between AI-generated and human-injected persona messages
- Conversation reads naturally as persona-to-persona dialogue
- Reduces cognitive load of tracking who's "really" speaking

### 2. Direct Participant Control
- Participants can "steer" their persona when AI goes off-track
- Maintains persona consistency even with human intervention
- Empowers participants without breaking immersion

### 3. Clearer Role Separation
- **Participants** = Control their persona (cyan, AI styling)
- **Host** = External moderator (orange, Human styling)
- **Moderator** = System guide (purple)

### 4. Better AI Responses
- AIs respond to personas, not to "humans"
- Maintains the established conversation model
- Prevents awkward "addressing the human" responses

## Use Cases

### Scenario 1: Course Correction
1. Participant notices their AI persona misunderstood something
2. Participant injects: "Actually, I meant we should focus on quality over speed"
3. Message appears as: `AI:QualityAdvocate (John): "Actually, I meant..."`
4. Other personas respond: "Good clarification, QualityAdvocate..."

### Scenario 2: Paused Meeting
1. AI personas deadlocked between two options
2. System auto-pauses, requests participant input
3. Participant Sarah injects: "Let's combine both approaches"
4. Appears as: `AI:Decision Facilitator (Sarah): "Let's combine..."`
5. Meeting resumes, other AIs respond to the suggestion naturally

### Scenario 3: Host Guidance
1. Conversation going off-topic
2. Host injects: "Focus back on the budget discussion"
3. Appears as: `Human:Host: "Focus back on..."`
4. Moderator sees this in context window
5. Next moderator decision incorporates host guidance

## Technical Notes

### Database Lookups
Two queries per inject:
1. Find participant by email: `SELECT id FROM participants WHERE meetingId = ? AND email = ?`
2. Find persona by participantId: `SELECT name FROM personas WHERE meetingId = ? AND participantId = ?`

**Performance:** Minimal impact, both queries use indexed columns (meetingId, email, participantId)

### Lazy Persona Generation
If participant injects before their persona is generated:
- Falls back to `Human:ParticipantName`
- Once persona is generated (on first AI selection), future injections use persona name
- Edge case: Rarely occurs since personas generated when moderator first selects them

### Moderator Context
The moderator's `moderatorDecideNext` function still sees `Human:` messages in history:
```typescript
const recentHumanMessages = recentHistory.filter(turn => turn.speaker.startsWith('Human:'));
```

This only catches **host** interjections now, which is correct:
- Host messages = external guidance
- Participant messages = persona speaking (no special handling needed)

## Edge Cases Handled

### 1. Participant Not Found
- Author doesn't match any participant email
- Assumes it's the host
- Uses `Human:Host`

### 2. Persona Not Generated Yet
- Participant exists but no persona created
- Falls back to `Human:ParticipantName`
- Logs warning for debugging

### 3. Multiple Participants Same Name
- Email matching is exact, not by display name
- Each participant has unique email
- No collision possible

### 4. Participant Email Updated
- If participant provides name via submission form
- Email field gets updated to their name
- Inject lookup uses updated email/name
- Works seamlessly

## Frontend Text Updates

### Participant Page
**Before:**
- Title: "Add Your Voice"
- Description: "You can contribute to the conversation at any time"

**After:**
- Title: "Speak Through Your Persona"
- Description: "You can take direct control of your AI persona at any time. Your message will appear as them speaking in the conversation."

**Impact:** Clearer understanding that they're controlling their persona, not adding separate human input

### Host Page
**Before:**
- Description: "Add your input to guide the AI conversation"

**After:**
- Description: "Add your input to guide the AI conversation. Your message will appear as 'Human:Host' in the conversation."

**Impact:** Sets clear expectation that host appears differently from participants

## Testing Checklist

- [ ] Participant injects message → Appears as their persona
- [ ] Host injects message → Appears as "Human:Host"
- [ ] AI responds to participant message as persona
- [ ] Conversation display shows correct styling (cyan for persona, orange for host)
- [ ] Paused meeting resumes after participant inject
- [ ] Multiple participants can inject, each as their own persona
- [ ] Edge case: Participant injects before persona generated (fallback works)
- [ ] Edge case: Non-existent participant (treated as host)

## Future Enhancements

### Potential Improvements:
1. **Visual Badge**: Add "👤→🤖" indicator on participant-controlled persona messages
2. **Message History**: Track which persona messages were human-injected vs AI-generated
3. **Edit History**: Allow participants to see/edit their persona's AI-generated messages
4. **Takeover Mode**: Explicit "take control" toggle where participant fully controls persona for multiple turns
5. **Hybrid Mode**: Show subtle indicator that message is participant-controlled while maintaining persona attribution

## Related Files
- `backend/src/routes.ts` - Inject endpoint with persona lookup
- `frontend/src/pages/Participant.tsx` - Updated UI text and description
- `frontend/src/pages/Host.tsx` - Updated UI text clarifying host role
- `backend/src/llm/gemini.ts` - Moderator still sees Human:Host messages for context

---

**Status**: ✅ Implemented and Active  
**Version**: 1.0  
**Date**: October 21, 2025
