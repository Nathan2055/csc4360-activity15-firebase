import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona, MCP, UUID } from './types.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;
export function getGemini(): GoogleGenerativeAI | null {
  if (!GEMINI_API_KEY) return null; // allow offline dev
  if (!genAI) genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI;
}

export function buildPersonaMCP(identity: string, objectives: string[]): MCP {
  return {
    identity,
    objectives,
    rules: [
      'Stick to your role and objectives.',
      'Be concise and factual.',
      'Propose actions when relevant.',
      'Respect the moderator and turn order.'
    ],
    outputFormat: 'JSON with fields: {speech: string, suggested_whiteboard_updates?: string[]}',
  };
}

export function buildModeratorMCP(): MCP {
  return {
    identity: 'You are the Moderator of an asynchronous, turn-based meeting. Facilitate a productive discussion and ensure objectives are met.',
    objectives: [
      'Select the next appropriate speaker each turn.',
      'Maintain a shared whiteboard of key facts, decisions and action items.',
      'Determine when objectives have been met using check_for_conclusion tool.'
    ],
    rules: [
      'One speaker at a time. Enforce turn-taking.',
      'Prioritize clarity and consensus.',
      'Use tools to update whiteboard and select speakers.'
    ],
    outputFormat: 'JSON: {selected_speaker: string, moderator_says?: string, whiteboard_updates?: {keyFacts?: string[], decisions?: string[], actionItems?: string[]}, check_for_conclusion?: boolean}',
    tools: ['update_whiteboard', 'select_next_speaker', 'check_for_conclusion']
  };
}

export interface GenerateArgs {
  system: string;
  prompt: string;
}

export async function generateText(args: GenerateArgs): Promise<string> {
  const client = getGemini();
  if (!client) {
    // Dev fallback: simple echo/heuristic
    return `DEV_RESPONSE: ${args.prompt.slice(0, 200)}`;
  }
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const res = await model.generateContent([{ text: args.system }, { text: args.prompt }]);
  const text = res.response.text();
  return text;
}

export function createPersona(name: string, identity: string, objectives: string[]): Persona {
  return {
    name,
    mcp: buildPersonaMCP(identity, objectives),
  };
}
