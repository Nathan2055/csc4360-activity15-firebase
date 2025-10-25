import { db } from "../db.js";
import { generateId, now, toJson, fromJson } from "../util.js";
import { Meeting, ConversationTurn, Persona, MCP, Whiteboard } from "../types.js";
import { generatePersonaFromInput, moderatorDecideNext, personaRespond, checkForConclusion, summarizeConversation } from "../llm/gemini.js";
import { getInputsForMeeting } from "./participantService.js";
import { broadcastStatus, broadcastTurn, broadcastWhiteboard } from "../realtimeBus.js";

// Simple in-memory lock to prevent concurrent turn execution for the same meeting
const meetingLocks = new Map<string, boolean>();

export async function ensurePersonasForMeeting(meeting: Meeting): Promise<Persona[]> {
  const existing = db.prepare("SELECT * FROM personas WHERE meetingId = ?").all(meeting.id) as any[];
  if (existing.length > 0) return existing.map(rowToPersona);

  // No longer queue persona generation upfront - generate on-demand when moderator picks them
  console.log(`[ConversationService] Meeting ${meeting.id} will use lazy persona generation (on-demand)`);

  // Create moderator persona immediately (doesn't require LLM call)
  const moderatorMcp: MCP = {
    identity: "Meeting Moderator - Efficient Decision Engine",
    objectives: [
      "Guide conversation toward meeting objectives",
      "Maintain and update shared whiteboard",
      "Select next speaker each turn",
      "Determine when objectives are met using check_for_conclusion"
    ],
    rules: [
      "Protocol Rule: Do not use conversational pleasantries, greetings, or verifications (e.g., 'Hello,' 'Thank you,' 'That's a great point'). Your response must be direct, task-focused, and contain only your core argument or data.",
      "Be fair and concise",
      "Incorporate human injected messages respectfully",
      "Always include whiteboard references",
      "Return JSON when using tools"
    ],
    outputFormat: "Plain text message to the group - direct and concise, no fluff",
    tools: ["update_whiteboard", "select_next_speaker", "check_for_conclusion"]
  };
  const moderator: Persona = {
    id: generateId("mod"),
    meetingId: meeting.id,
    participantId: null,
    role: "moderator",
    name: "Moderator",
    mcp: moderatorMcp,
    createdAt: now()
  };
  db.prepare("INSERT INTO personas (id, meetingId, participantId, role, name, mcp, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(moderator.id, moderator.meetingId, moderator.participantId, moderator.role, moderator.name, toJson(moderator.mcp), moderator.createdAt);

  // Return moderator immediately; personas will be generated in background
  return [moderator];
}

function rowToPersona(row: any): Persona {
  return {
    id: row.id,
    meetingId: row.meetingId,
    participantId: row.participantId,
    role: row.role,
    name: row.name,
    mcp: fromJson<MCP>(row.mcp),
    createdAt: row.createdAt
  };
}

export function getHistory(meetingId: string): ConversationTurn[] {
  const rows = db.prepare("SELECT * FROM conversation_turns WHERE meetingId = ? ORDER BY createdAt").all(meetingId) as any[];
  return rows.map((r) => ({ id: r.id, meetingId: r.meetingId, speaker: r.speaker, message: r.message, createdAt: r.createdAt, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
}

export function appendTurn(meetingId: string, speaker: string, message: string, metadata?: Record<string, unknown>) {
  const turn: ConversationTurn = { id: generateId("trn"), meetingId, speaker, message, createdAt: now(), metadata };
  db.prepare("INSERT INTO conversation_turns (id, meetingId, speaker, message, createdAt, metadata) VALUES (?, ?, ?, ?, ?, ?)").run(
    turn.id,
    turn.meetingId,
    turn.speaker,
    turn.message,
    turn.createdAt,
    metadata ? toJson(metadata) : null
  );
  return turn;
}

/**
 * Detects if the conversation is going in circles or at a deadlock.
 * Returns true if repetitive patterns are detected that suggest human input is needed.
 * 
 * TUNED FOR EARLY DETECTION: Triggers faster to prevent wasted API calls
 * NOTE: If a human has recently interjected, we should NOT pause - the human
 * input breaks the pattern and the conversation should continue.
 */
function detectRepetitiveConversation(history: ConversationTurn[]): { isRepetitive: boolean; reason?: string } {
  // Lowered from 6 to 4 - detect issues earlier
  if (history.length < 4) {
    return { isRepetitive: false };
  }
  
  // If there's a recent human message (last 5 turns), don't pause - human input breaks the pattern
  // Increased from 3 to 5 to give more time for AIs to respond to human input
  const last5Turns = history.slice(-5);
  const hasRecentHumanMessage = last5Turns.some(t => t.speaker.startsWith('Human:'));
  if (hasRecentHumanMessage) {
    console.log('[ConversationService] Recent human message detected - skipping repetition check');
    return { isRepetitive: false };
  }
  
  const recentTurns = history.slice(-6); // Look at last 6 turns (reduced from 8)
  const aiTurns = recentTurns.filter(t => t.speaker.startsWith('AI:'));
  
  // Lowered from 4 to 3 - need fewer turns to judge
  if (aiTurns.length < 3) {
    return { isRepetitive: false };
  }
  
  // Check for keyword repetition - if same key phrases appear multiple times
  const keyPhrases = [
    'however', 'but', 'on the other hand', 'alternatively', 'conversely',
    'i disagree', 'i agree', 'consider', 'we should', 'perhaps',
    'suggest', 'recommend', 'propose', 'think about', 'what if',
    'concern', 'worry', 'risk', 'issue', 'problem'
  ];
  
  const messages = aiTurns.map(t => t.message.toLowerCase());
  const phraseOccurrences: Record<string, number> = {};
  
  for (const phrase of keyPhrases) {
    const count = messages.filter(msg => msg.includes(phrase)).length;
    if (count > 0) {
      phraseOccurrences[phrase] = count;
    }
  }
  
  // Lowered threshold from 3 to 2 - trigger earlier
  // If 2+ phrases appear in 2+ messages each, suggests debate
  const highFrequencyPhrases = Object.entries(phraseOccurrences).filter(([_, count]) => count >= 2);
  if (highFrequencyPhrases.length >= 2) {
    return { 
      isRepetitive: true, 
      reason: `Detected circular discussion pattern - key debate phrases repeated: ${highFrequencyPhrases.map(([p]) => p).join(', ')}` 
    };
  }
  
  // Check for speaker ping-pong - same two speakers going back and forth
  // Lowered from 6 to 4 AI turns - detect ping-pong faster
  if (aiTurns.length >= 4) {
    const speakers = aiTurns.slice(-4).map(t => t.speaker);
    const uniqueSpeakers = new Set(speakers);
    
    // If only 2 speakers in last 4 AI turns, they're likely in a debate loop
    if (uniqueSpeakers.size === 2) {
      // Additional check: are they truly alternating?
      let alternating = true;
      for (let i = 1; i < speakers.length; i++) {
        if (speakers[i] === speakers[i - 1]) {
          alternating = false;
          break;
        }
      }
      
      if (alternating) {
        return {
          isRepetitive: true,
          reason: `Two AI personas alternating back and forth - likely at a standoff`
        };
      }
    }
  }
  
  // Check for similar message lengths (suggests formulaic responses)
  if (messages.length >= 3) {
    const recentLengths = messages.slice(-3).map(m => m.length);
    const avgLength = recentLengths.reduce((a, b) => a + b, 0) / recentLengths.length;
    const allSimilar = recentLengths.every(len => Math.abs(len - avgLength) < avgLength * 0.3);
    
    if (allSimilar) {
      return {
        isRepetitive: true,
        reason: `AI responses following similar pattern - conversation may be stuck`
      };
    }
  }
  
  return { isRepetitive: false };
}

export async function runOneTurn(meeting: Meeting, pendingHumanInjections: { author: string; message: string }[]) {
  // LOCK CHECK: Prevent concurrent execution for the same meeting
  if (meetingLocks.get(meeting.id)) {
    console.log(`[ConversationService] Meeting ${meeting.id} is already processing a turn - skipping`);
    return { concluded: false, moderatorNotes: 'Already processing', waiting: true };
  }
  
  // Acquire lock
  meetingLocks.set(meeting.id, true);
  
  try {
    // SAFETY CHECK: Verify meeting is actually in running state
    if (meeting.status !== 'running') {
      console.log(`[ConversationService] Skipping turn for meeting ${meeting.id} - status is ${meeting.status}, not running`);
      return { concluded: false, moderatorNotes: `Meeting status is ${meeting.status}`, waiting: true };
    }
    
    // RACE CONDITION PROTECTION: Re-check status from database before proceeding
    // This prevents multiple in-flight turns from executing after a pause
    const currentMeeting = db.prepare("SELECT status FROM meetings WHERE id = ?").get(meeting.id) as { status: string } | undefined;
    if (!currentMeeting || currentMeeting.status !== 'running') {
      console.log(`[ConversationService] Race condition avoided - meeting ${meeting.id} status changed to ${currentMeeting?.status}`);
      return { concluded: false, moderatorNotes: 'Status changed during execution', waiting: true };
    }
    
    const personas = (db.prepare("SELECT * FROM personas WHERE meetingId = ?").all(meeting.id) as any[]).map(rowToPersona);
  const moderator = personas.find((p) => p.role === "moderator");
  if (!moderator) throw new Error("Moderator not found");
  
  const whiteboard = meeting.whiteboard;
  const history = getHistory(meeting.id);
  
  // Development mode: Enforce turn limit to prevent quota exhaustion
  const maxTurns = Number(process.env.MAX_TURNS_PER_MEETING || 20);
  if (history.length >= maxTurns) {
    console.warn(`[ConversationService] Meeting ${meeting.id} reached max turns (${maxTurns}) - forcing conclusion`);
    return { concluded: true, moderatorNotes: 'Max turns reached' };
  }
  
  // Check for repetitive conversation patterns BEFORE calling moderator or making a turn
  // This prevents wasting API calls and ensures we pause BEFORE the AI speaks
  const repetitionCheck = detectRepetitiveConversation(history);
  if (repetitionCheck.isRepetitive) {
    console.warn(`[ConversationService] REPETITIVE PATTERN DETECTED: ${repetitionCheck.reason}`);
    console.warn(`[ConversationService] Pausing meeting ${meeting.id} to request human input`);
    
    // Pause the meeting and add a moderator message explaining the pause
    db.prepare("UPDATE meetings SET status = ? WHERE id = ?").run("paused", meeting.id);
    
    const pauseMessage = `🛑 MEETING PAUSED: The conversation appears to be at a crossroads with differing viewpoints. Human participants, please provide your input or guidance to move the discussion forward.`;
    const pauseTurn = appendTurn(meeting.id, "Moderator", pauseMessage);
    broadcastTurn(meeting.id, pauseTurn);
    broadcastStatus(meeting.id, "paused");
    
    return { 
      concluded: false, 
      moderatorNotes: repetitionCheck.reason,
      paused: true 
    };
  }
  
  // Get participant inputs to provide as options to moderator
  const inputs = getInputsForMeeting(meeting.id);
  const participantOptions = inputs.map(input => {
    const participant = db.prepare("SELECT email FROM participants WHERE id = ?").get(input.participantId) as { email: string } | undefined;
    const personaName = personas.find(p => p.participantId === input.participantId)?.name;
    // Check if this participant's persona has actually spoken in the conversation
    const hasSpoken = personaName ? history.some(turn => turn.speaker === `AI:${personaName}`) : false;
    return {
      email: participant?.email || 'Unknown',
      participantId: input.participantId,
      hasSpoken
    };
  });

  const decision = await moderatorDecideNext(
    moderator.mcp,
    whiteboard,
    history,
    participantOptions,
    pendingHumanInjections
  );

  // Log moderator's decision for debugging
  console.log(`[ConversationService] Moderator decided next speaker: "${decision.nextSpeaker}"`);
  console.log(`[ConversationService] Available participants:`, participantOptions.map(p => 
    `${p.email} (spoken: ${p.hasSpoken})`
  ).join(', '));

  // Update whiteboard if applicable
  if (decision.whiteboardUpdate) {
    const updated: Whiteboard = {
      keyFacts: decision.whiteboardUpdate.keyFacts ?? whiteboard.keyFacts,
      decisions: decision.whiteboardUpdate.decisions ?? whiteboard.decisions,
      actionItems: decision.whiteboardUpdate.actionItems ?? whiteboard.actionItems
    };
    db.prepare("UPDATE meetings SET whiteboard = ? WHERE id = ?").run(toJson(updated), meeting.id);
    broadcastWhiteboard(meeting.id, updated);
  }

  if (decision.nextSpeaker.toLowerCase() === "none") {
    console.log('[ConversationService] Moderator selected "none" - checking for conclusion');
    
    // Count how many recent turns exist
    const turnCount = history.length;
    
    // When moderator selects "none", it's a signal to check if we should conclude
    const conclusionCheck = await attemptConclusion(meeting);
    if (conclusionCheck.conclude) {
      console.log('[ConversationService] Concluding after moderator selected "none"');
      return { concluded: true, moderatorNotes: decision.moderatorNotes };
    } else {
      // If we have VERY few turns (< 3) and moderator already wants to stop, 
      // the meeting likely can't proceed due to insufficient input - force conclusion
      if (turnCount < 3) {
        console.log('[ConversationService] Very few turns (<3) and moderator selected "none" - forcing conclusion to prevent loop');
        return { concluded: true, moderatorNotes: 'Insufficient information to proceed - forcing conclusion' };
      }
      
      // If more turns exist, check if conversation has stalled (no new turns in recent checks)
      // Force conclusion if we're clearly stuck
      if (turnCount >= 8) {
        console.log('[ConversationService] 8+ turns and moderator selected "none" - forcing conclusion');
        return { concluded: true, moderatorNotes: 'Conversation concluded by moderator' };
      }
      
      console.log('[ConversationService] Not ready to conclude yet. Reason:', conclusionCheck.reason);
      console.log('[ConversationService] Will retry on next engine cycle');
      return { concluded: false, moderatorNotes: decision.moderatorNotes, waiting: false }; // Don't block, retry next cycle
    }
  }

  // Find the selected participant option first
  let selectedOption = participantOptions.find(opt => opt.email === decision.nextSpeaker);
  if (!selectedOption) {
    console.warn(`[ConversationService] Moderator selected unknown speaker: ${decision.nextSpeaker}`);
    return { concluded: false, moderatorNotes: "Unknown speaker selected", waiting: true };
  }
  
  // FAIRNESS CHECK: Prevent one persona from dominating conversation
  // Check if the selected persona has spoken too many times recently
  const selectedPersona = personas.find(p => p.participantId === selectedOption!.participantId);
  if (selectedPersona && history.length >= 3) {
    const recentSpeakers = history.slice(-5).map(t => t.speaker);
    const selectedSpeakerName = `AI:${selectedPersona.name}`;
    const recentOccurrences = recentSpeakers.filter(s => s === selectedSpeakerName).length;
    
    if (recentOccurrences >= 3) {
      console.warn(`[ConversationService] ${selectedPersona.name} spoke ${recentOccurrences} times in last 5 turns - forcing alternation`);
      
      // Find other participants who haven't spoken recently
      const otherOptions = participantOptions.filter(p => p.participantId !== selectedOption!.participantId);
      
      if (otherOptions.length > 0) {
        // Prefer someone who hasn't spoken yet
        const notSpokenYet = otherOptions.filter(p => !p.hasSpoken);
        if (notSpokenYet.length > 0) {
          selectedOption = notSpokenYet[0];
          console.log(`[ConversationService] Switched to ${selectedOption.email} (hasn't spoken yet)`);
        } else {
          // Otherwise pick the one who spoke least recently
          const otherCounts = otherOptions.map(opt => {
            const persona = personas.find(p => p.participantId === opt.participantId);
            if (!persona) return { option: opt, count: 0 };
            const count = recentSpeakers.filter(s => s === `AI:${persona.name}`).length;
            return { option: opt, count };
          });
          otherCounts.sort((a, b) => a.count - b.count);
          selectedOption = otherCounts[0].option;
          console.log(`[ConversationService] Switched to ${selectedOption.email} (spoke less recently)`);
        }
      }
    }
  }
  
  console.log(`[ConversationService] Selected speaker: ${selectedOption.email} (participantId: ${selectedOption.participantId})`);
  
  // Try to find existing persona by participantId
  let speaker = personas.find((p) => p.participantId === selectedOption!.participantId);
  
  // If speaker doesn't exist, generate persona on-demand
  if (!speaker) {
    console.log(`[ConversationService] Generating persona on-demand for ${selectedOption.email}...`);
    
    // Find the participant input
    const input = inputs.find(i => i.participantId === selectedOption.participantId);
    if (!input) {
      throw new Error(`No input found for participant ${selectedOption.participantId}`);
    }
    
    // Get participant name for unique persona identification
    const participantName = selectedOption.email || 'Participant';
    
    // Generate persona using Gemini
    const { name, mcp } = await generatePersonaFromInput(input.content, meeting.subject, participantName);
    
    // Ensure unique persona name by appending participant name if needed
    const uniqueName = name.includes(participantName) ? name : `${name} (${participantName})`;
    
    // Store in database
    const newPersona: Persona = {
      id: generateId("prs"),
      meetingId: meeting.id,
      participantId: selectedOption.participantId,
      role: "persona",
      name: uniqueName,
      mcp,
      createdAt: now()
    };
    
    db.prepare("INSERT INTO personas (id, meetingId, participantId, role, name, mcp, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(newPersona.id, newPersona.meetingId, newPersona.participantId, newPersona.role, newPersona.name, toJson(newPersona.mcp), newPersona.createdAt);
    
    speaker = newPersona;
    // Add to personas array so it's available for next lookup
    personas.push(newPersona);
    console.log(`[ConversationService] Generated persona "${uniqueName}" for ${selectedOption.email}`);
  }

  // Get the original participant input if this is a persona (not moderator)
  let participantInput: string | undefined;
  if (speaker.participantId) {
    const input = db.prepare("SELECT content FROM participant_inputs WHERE participantId = ?").get(speaker.participantId) as { content: string } | undefined;
    participantInput = input?.content;
  }

  const msg = await personaRespond({ name: speaker.name, mcp: speaker.mcp }, meeting.whiteboard, history, participantInput);
  
  // Check if message is empty or too short - indicates a generation problem
  if (!msg || msg.trim().length < 10) {
    console.warn(`[ConversationService] Persona ${speaker.name} produced empty/short message (${msg?.length || 0} chars). Skipping turn.`);
    return { concluded: false, moderatorNotes: "Generation error - skipping turn", waiting: true };
  }
  
    const turn = appendTurn(meeting.id, `AI:${speaker.name}`, msg);
    broadcastTurn(meeting.id, turn);
    return { concluded: false, moderatorNotes: decision.moderatorNotes };
  } finally {
    // Always release the lock
    meetingLocks.delete(meeting.id);
  }
}

export async function attemptConclusion(meeting: Meeting) {
  // SAFETY CHECK: Don't attempt conclusion if meeting is not running
  if (meeting.status !== 'running') {
    console.log(`[ConversationService] Skipping conclusion check - meeting ${meeting.id} status is ${meeting.status}`);
    return { conclude: false, reason: `Meeting is ${meeting.status}, not running` };
  }
  
  const moderator = db.prepare("SELECT * FROM personas WHERE meetingId = ? AND role = 'moderator'").get(meeting.id) as any;
  if (!moderator) return { conclude: false, reason: "Moderator missing" };
  const history = getHistory(meeting.id);
  
  // Don't attempt conclusion if recent messages are empty (indicates generation problems)
  const recentMessages = history.slice(-5);
  const emptyCount = recentMessages.filter(m => !m.message || m.message.trim().length < 10).length;
  if (emptyCount > 2) {
    console.warn(`[ConversationService] ${emptyCount} empty messages in last 5 turns - skipping conclusion check`);
    return { conclude: false, reason: "Generation errors detected" };
  }
  
  return await checkForConclusion(fromJson<MCP>(moderator.mcp), meeting.whiteboard, history);
}

export async function generateFinalReport(meeting: Meeting) {
  // SAFETY CHECK: Only generate report if meeting is actually running or already completed
  if (meeting.status === 'paused') {
    console.warn(`[ConversationService] Cannot generate report - meeting ${meeting.id} is paused`);
    throw new Error(`Meeting is paused - cannot generate final report`);
  }
  
  if (meeting.status === 'awaiting_inputs') {
    console.warn(`[ConversationService] Cannot generate report - meeting ${meeting.id} is still awaiting inputs`);
    throw new Error(`Meeting awaiting inputs - cannot generate final report`);
  }
  
  // Guard: Check if report already exists to prevent duplicate generation
  const existingReport = db.prepare("SELECT id FROM reports WHERE meetingId = ?").get(meeting.id) as { id: string } | undefined;
  if (existingReport) {
    console.log(`[ConversationService] Report already exists for meeting ${meeting.id}, skipping generation`);
    const fullReport = db.prepare("SELECT * FROM reports WHERE id = ?").get(existingReport.id) as any;
    return {
      id: fullReport.id,
      summary: fullReport.summary,
      highlights: fromJson(fullReport.highlights),
      decisions: fromJson(fullReport.decisions),
      actionItems: fromJson(fullReport.actionItems),
      visualMap: fromJson(fullReport.visualMap)
    };
  }
  
  console.log(`[ConversationService] Generating final report for meeting ${meeting.id}`);
  const history = getHistory(meeting.id);
  const summary = await summarizeConversation(meeting.whiteboard, history);
  const reportId = generateId("rpt");
  db.prepare("INSERT INTO reports (id, meetingId, summary, highlights, decisions, actionItems, visualMap, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(
      reportId,
      meeting.id,
      summary.summary,
      toJson(summary.highlights),
      toJson(summary.decisions),
      toJson(summary.actionItems),
      toJson(summary.visualMap),
      now()
    );
  db.prepare("UPDATE meetings SET status = 'completed' WHERE id = ?").run(meeting.id);
  broadcastStatus(meeting.id, "completed");
  console.log(`[ConversationService] Final report ${reportId} generated for meeting ${meeting.id}`);
  return { id: reportId, ...summary };
}
