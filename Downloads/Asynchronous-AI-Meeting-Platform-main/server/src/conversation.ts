import { nanoid } from 'nanoid';
import { db, insertTurn, listTurns, getParticipantsByMeeting } from './db.js';
import { broadcastStatus, broadcastTurn } from './sse.js';
import { createPersona, buildModeratorMCP, generateText } from './gemini.js';
import { ConversationTurn, Whiteboard, UUID, Persona } from './types.js';
import { ensureReport } from './report.js';
import { sendReportMail } from './email.js';
import { getMeetingById } from './db.js';

export interface ConversationState {
  meetingId: UUID;
  whiteboard: Whiteboard;
  personas: Persona[];
  status: 'idle' | 'running' | 'paused' | 'completed';
  nextSpeaker?: string; // persona name or 'moderator'
}

const meetingState = new Map<UUID, ConversationState>();

export function getState(meetingId: UUID): ConversationState | undefined {
  return meetingState.get(meetingId);
}

export async function initializeConversation(meetingId: UUID): Promise<ConversationState> {
  const participants = getParticipantsByMeeting(meetingId) as any[];
  const personas: Persona[] = participants.map((p, idx) =>
    createPersona(
      `P${idx + 1}-${p.email}`,
      `You represent participant ${p.email}.`,
      [
        'Advance the meeting objectives based on your perspective.',
        'Respond briefly yet substantively to prior turns and the whiteboard.',
      ]
    )
  );
  const state: ConversationState = {
    meetingId,
    whiteboard: { keyFacts: [], decisions: [], actionItems: [] },
    personas,
    status: 'idle',
    nextSpeaker: 'moderator',
  };
  meetingState.set(meetingId, state);
  return state;
}

export function pause(meetingId: UUID) {
  const s = meetingState.get(meetingId);
  if (!s) return;
  s.status = 'paused';
  broadcastStatus(meetingId, 'paused');
}

export function resume(meetingId: UUID) {
  const s = meetingState.get(meetingId);
  if (!s) return;
  s.status = 'running';
  broadcastStatus(meetingId, 'running');
}

export async function runTurnLoop(meetingId: UUID, shouldStop: () => boolean) {
  const s = meetingState.get(meetingId);
  if (!s) return;
  s.status = 'running';
  broadcastStatus(meetingId, 'running');

  const moderatorMCP = buildModeratorMCP();

  // Basic bounded loop to avoid runaway in dev
  for (let turnIdx = 0; turnIdx < 50; turnIdx++) {
    if (shouldStop()) break;
    if (s.status !== 'running') {
      await new Promise((r) => setTimeout(r, 500));
      turnIdx--;
      continue;
    }

    // Fetch last few turns for context
    const history = listTurns(meetingId) as ConversationTurn[];
    const whiteboardText = `Key Facts: ${s.whiteboard.keyFacts.join('; ')}\nDecisions: ${s.whiteboard.decisions.join('; ')}\nAction Items: ${s.whiteboard.actionItems.join('; ')}`;

    // Moderator selects next speaker and possible updates
    const moderatorPrompt = `You are the moderator. Given the history and whiteboard, select the next speaker among: ${s.personas.map(p=>p.name).join(', ')}. If close to conclusion, set check_for_conclusion to true.`;
    const modJsonRaw = await generateText({
      system: moderatorMCP.identity + '\nRules: ' + moderatorMCP.rules.join(' '),
      prompt: `Whiteboard:\n${whiteboardText}\n\nHistory:\n${history.map(h => h.speaker + ': ' + h.content).slice(-15).join('\n')}\n\n${moderatorPrompt}`,
    });

    let selected = s.personas[0]?.name || '';
    let conclude = false;
    try {
      const parsed = JSON.parse(modJsonRaw.replace(/^```(json)?/,'').replace(/```$/,''));
      if (parsed.selected_speaker) selected = parsed.selected_speaker;
      if (parsed.whiteboard_updates) {
        if (parsed.whiteboard_updates.keyFacts) s.whiteboard.keyFacts.push(...parsed.whiteboard_updates.keyFacts);
        if (parsed.whiteboard_updates.decisions) s.whiteboard.decisions.push(...parsed.whiteboard_updates.decisions);
        if (parsed.whiteboard_updates.actionItems) s.whiteboard.actionItems.push(...parsed.whiteboard_updates.actionItems);
      }
      if (parsed.check_for_conclusion === true) conclude = true;
      if (parsed.moderator_says) {
        const modTurn: ConversationTurn = {
          id: nanoid(), meetingId, role: 'moderator', speaker: 'Moderator', content: parsed.moderator_says, createdAt: Date.now()
        };
        insertTurn.run(modTurn);
        broadcastTurn(modTurn);
      }
    } catch {
      // fallback
      selected = s.personas[(turnIdx) % s.personas.length]?.name || selected;
    }

    if (!selected) break;

    // Persona speaks
    const persona = s.personas.find(p => p.name === selected) || s.personas[0];
    const personaSystem = `${persona.mcp.identity}\nObjectives: ${persona.mcp.objectives.join('; ')}\nRules: ${persona.mcp.rules.join('; ')}`;
    const personaPrompt = `Whiteboard:\n${whiteboardText}\n\nRecent turns:\n${history.map(h => h.speaker + ': ' + h.content).slice(-6).join('\n')}\n\nSpeak your turn in max 120 words.`;
    const personaRaw = await generateText({ system: personaSystem, prompt: personaPrompt });
    let speech = personaRaw;
    try {
      const pj = JSON.parse(personaRaw.replace(/^```(json)?/,'').replace(/```$/,''));
      if (typeof pj.speech === 'string') speech = pj.speech;
      const updates: string[] | undefined = pj.suggested_whiteboard_updates;
      if (Array.isArray(updates) && updates.length) s.whiteboard.keyFacts.push(...updates);
    } catch {
      // leave raw
    }

    const turn: ConversationTurn = {
      id: nanoid(), meetingId, role: 'persona', speaker: persona.name, content: speech, createdAt: Date.now()
    };
    insertTurn.run(turn);
    broadcastTurn(turn);

    if (conclude) {
      s.status = 'completed';
      broadcastStatus(meetingId, 'completed');
      // Generate report and send links
      const report = await ensureReport(meetingId);
      const meeting = getMeetingById(meetingId) as any;
      const participants = getParticipantsByMeeting(meetingId) as any[];
      const url = `${process.env.WEB_ORIGIN || 'http://localhost:5173'}/report/${meetingId}`;
      for (const p of participants) {
        sendReportMail({ to: p.email, meetingSubject: meeting?.subject || 'Meeting', reportUrl: url }).catch(()=>{});
      }
      break;
    }

    // continue loop
    await new Promise((r) => setTimeout(r, 300));
  }
}
