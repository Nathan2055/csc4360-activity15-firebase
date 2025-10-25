import { GoogleGenerativeAI } from "@google/generative-ai";
import { MCP, Whiteboard, ConversationTurn, ConversationGraph } from "../types.js";
import { GeminiRateLimiter } from "./rateLimiter.js";
import { 
  estimateInputTokens, 
  estimateOutputTokens, 
  getMaxOutputTokens,
  extractTokenUsage,
  logTokenUsage,
  calculateTotalEstimate 
} from "./tokenEstimator.js";
import { withRetry, GEMINI_RETRY_CONFIG } from "./retryHandler.js";

// This is a thin wrapper around Gemini calls used across services.
// It centralizes prompt construction to honor the SRS constraint that all LLM ops go through Gemini.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Separate rate limiters for moderator and participant personas
// This allows independent quota management and prevents moderator from exhausting participant quota

// Moderator rate limiter (uses GEMINI_MODERATOR_API_KEY)
const moderatorRateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 15,
  tokensPerMinute: 1_000_000,
  requestsPerDay: 1500,
});

// Participant personas rate limiter (uses GEMINI_API_KEY)
const participantRateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 15,
  tokensPerMinute: 1_000_000,
  requestsPerDay: 1500,
});

function getClient(useModerator: boolean = false) {
  const apiKey = useModerator 
    ? (process.env.GEMINI_MODERATOR_API_KEY || process.env.GEMINI_API_KEY)
    : process.env.GEMINI_API_KEY;
    
  if (!apiKey) {
    throw new Error(useModerator 
      ? "GEMINI_MODERATOR_API_KEY or GEMINI_API_KEY not set" 
      : "GEMINI_API_KEY not set"
    );
  }
  
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Extract JSON from Gemini response (handles markdown code blocks)
 */
function extractJson(text: string): any {
  if (!text || text.trim().length === 0) {
    throw new Error("Empty response text");
  }
  
  let jsonText = text.trim();
  
  // Remove markdown code blocks if present
  jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Try to find JSON object with balanced braces
  const openBrace = jsonText.indexOf('{');
  if (openBrace === -1) {
    throw new Error(`No opening brace found in response (length: ${text.length})`);
  }
  
  // Find matching closing brace
  let depth = 0;
  let closeBrace = -1;
  for (let i = openBrace; i < jsonText.length; i++) {
    if (jsonText[i] === '{') depth++;
    if (jsonText[i] === '}') {
      depth--;
      if (depth === 0) {
        closeBrace = i;
        break;
      }
    }
  }
  
  if (closeBrace === -1 || depth !== 0) {
    throw new Error(`Incomplete JSON object in response (length: ${text.length}, depth: ${depth})`);
  }
  
  const jsonString = jsonText.substring(openBrace, closeBrace + 1);
  
  try {
    return JSON.parse(jsonString);
  } catch (parseError: any) {
    throw new Error(`JSON parse error: ${parseError.message}. JSON string: ${jsonString.substring(0, 100)}...`);
  }
}

/**
 * Get rate limiter status for both moderator and participant quotas
 */
export function getRateLimiterStatus() {
  return {
    moderator: moderatorRateLimiter.getStatus(),
    participants: participantRateLimiter.getStatus()
  };
}

export async function generatePersonaFromInput(
  input: string,
  meetingSubject: string,
  participantName?: string
): Promise<{ name: string; mcp: MCP }> {
  const system = `You are to produce a JSON object for an AI Persona's Model Contextual Protocol (MCP). 
IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.
Keep descriptions brief (under 30 words each). Limit to 3-4 objectives and 3-4 rules.`;
  
  const nameHint = participantName ? `\nParticipant Name: ${participantName} (use this name for the persona)` : '';
  
  const user = `Meeting Subject: ${meetingSubject}
Participant Input: ${input}${nameHint}

Generate a persona for an efficient decision-making meeting.

CRITICAL: First rule must be:
"Do not use pleasantries or greetings. Be direct and task-focused."

${participantName ? `Use "${participantName}" as the persona name.` : 'Create a descriptive persona name.'}

Return ONLY this JSON (no markdown, keep it concise):
{
  "name": "${participantName || 'PersonaName'}",
  "mcp": {
    "identity": "Brief description (under 30 words)",
    "objectives": ["Objective 1", "Objective 2", "Objective 3"],
    "rules": [
      "Do not use pleasantries or greetings. Be direct and task-focused.",
      "Rule 2",
      "Rule 3"
    ],
    "outputFormat": "Concise and direct"
  }
}`;
  
  // Estimate tokens
  const estimatedInput = estimateInputTokens(system, user);
  const estimatedOutput = estimateOutputTokens('json');
  const totalEstimated = calculateTotalEstimate(estimatedInput, estimatedOutput);
  
  // Schedule with participant rate limiter and retry logic
  return await participantRateLimiter.scheduleRequest(
    async () => {
      return await withRetry(
        async () => {
          const genAI = getClient(false); // Use participant API key
          const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: {
              maxOutputTokens: 4000,
              temperature: 0.7,
              responseMimeType: "application/json", // Force JSON output
            }
          });
          
          const resp = await model.generateContent({ 
            contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }] 
          });
          
          // Check if response is complete
          if (!resp.response || !resp.response.candidates || resp.response.candidates.length === 0) {
            throw new Error('Empty or incomplete response from Gemini API');
          }
          
          // Check for safety blocks or truncation
          const candidate = resp.response.candidates[0];
          if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn('[Gemini] generatePersonaFromInput unusual finish reason:', candidate.finishReason);
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
              throw new Error(`Response blocked by ${candidate.finishReason} filter`);
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
              console.warn('[Gemini] Persona response truncated due to MAX_TOKENS');
            }
          }
          
          // Extract actual usage and reconcile
          const actualUsage = extractTokenUsage(resp);
          if (actualUsage) {
            participantRateLimiter.reconcileUsage(totalEstimated, actualUsage.totalTokens);
            logTokenUsage(
              'generatePersonaFromInput',
              { input: estimatedInput, output: estimatedOutput, total: totalEstimated },
              actualUsage
            );
          }
          
          const text = resp.response.text().trim();
          console.log('[Gemini] generatePersonaFromInput raw response length:', text.length, 'chars');
          console.log('[Gemini] generatePersonaFromInput raw response:', text);
          
          // Check for empty or truncated response
          if (!text || text.length < 50) {
            throw new Error(`Response too short or empty (${text.length} chars): ${text}`);
          }
          
          try {
            const parsed = extractJson(text);
            
            // Validate the structure
            if (!parsed.name || typeof parsed.name !== 'string') {
              throw new Error('Missing or invalid "name" field');
            }
            if (!parsed.mcp || typeof parsed.mcp !== 'object') {
              throw new Error('Missing or invalid "mcp" field');
            }
            if (!parsed.mcp.identity || !Array.isArray(parsed.mcp.objectives) || !Array.isArray(parsed.mcp.rules) || !parsed.mcp.outputFormat) {
              throw new Error('Invalid MCP structure - missing required fields');
            }
            
            return { name: parsed.name, mcp: parsed.mcp as MCP };
          } catch (parseError: any) {
            console.error('[Gemini] generatePersonaFromInput parse error:', parseError.message);
            console.error('[Gemini] Raw text:', text);
            throw new Error(`Failed to parse persona MCP JSON: ${parseError.message}`);
          }
        },
        'generatePersonaFromInput',
        GEMINI_RETRY_CONFIG
      );
    },
    totalEstimated,
    1 // High priority for persona generation
  );
}

export async function moderatorDecideNext(
  moderatorMcp: MCP,
  whiteboard: Whiteboard,
  history: ConversationTurn[],
  participantOptions: { email: string; participantId: string; hasSpoken: boolean }[],
  pendingHumanInjections: { author: string; message: string }[]
): Promise<{ nextSpeaker: string; moderatorNotes: string; whiteboardUpdate?: Partial<Whiteboard> }>
{
  // Compact prompt with essential context
  const recentHistory = history.slice(-5); // Show last 5 turns to include human messages
  const lastSpeaker = recentHistory.length > 0 ? recentHistory[recentHistory.length - 1].speaker : 'none';
  const lastMessage = recentHistory.length > 0 ? recentHistory[recentHistory.length - 1].message : '';
  
  // Check for recent human messages
  const recentHumanMessages = recentHistory.filter(turn => turn.speaker.startsWith('Human:'));
  const humanContext = recentHumanMessages.length > 0 
    ? `\nRECENT HUMAN INPUT (IMPORTANT - RESPOND TO THIS): ${recentHumanMessages.map(h => `${h.speaker}: "${h.message.substring(0, 100)}"`).join(' | ')}`
    : '';
  
  // Check if the last message contains a question or direct address to someone
  const questionMatch = lastMessage.match(/(\w+),?\s+(what|how|why|do you|can you|would you|could you|should we)/i);
  const directAddress = questionMatch ? questionMatch[1] : null;
  
  // Separate participants into spoke/not-spoke groups for clarity
  const notSpoken = participantOptions.filter(p => !p.hasSpoken).map(p => p.email);
  const hasSpoken = participantOptions.filter(p => p.hasSpoken).map(p => p.email);
  
  // Extract who spoke last (remove AI: prefix to get just the email/name)
  const lastSpeakerEmail = lastSpeaker.startsWith('AI:') ? lastSpeaker.substring(3) : lastSpeaker;
  
  // Find who should respond next by alternation (anyone except the last speaker)
  const othersWhoSpoke = hasSpoken.filter(email => 
    !lastSpeakerEmail.includes(email) && !email.includes(lastSpeakerEmail.split(' ')[0])
  );
  
  // Build clear instruction with alternation preference
  let instruction = '';
  if (directAddress && hasSpoken.some(email => email.toLowerCase().includes(directAddress.toLowerCase()))) {
    // Priority 1: Direct question - let the addressed person respond
    const addressedPerson = hasSpoken.find(email => email.toLowerCase().includes(directAddress.toLowerCase()));
    instruction = `⚠️ QUESTION ASKED TO ${addressedPerson}. Let them respond. Pick: ${addressedPerson}`;
  } else if (notSpoken.length > 0) {
    // Priority 2: Let people who haven't spoken yet go first
    instruction = `Pick from: ${notSpoken.join(', ')}`;
  } else if (othersWhoSpoke.length > 0) {
    // Priority 3: ALTERNATE - pick someone OTHER than the last speaker
    instruction = `ALTERNATE SPEAKERS. Last was ${lastSpeakerEmail}. Pick from: ${othersWhoSpoke.join(', ')}`;
  } else if (hasSpoken.length > 0) {
    // Priority 4: Everyone spoke, allow any (including "none" if stuck)
    instruction = `All spoke. Pick from: ${hasSpoken.join(', ')} or "none" if stuck.`;
  } else {
    instruction = 'No participants available. Pick "none".';
  }
  
  const user = `Last: ${lastSpeaker}: "${lastMessage.substring(0, 150)}"${humanContext}
${instruction}
{"nextSpeaker":"email or none","moderatorNotes":"brief","whiteboardUpdate":{"keyFacts":["brief"],"decisions":[],"actionItems":[]}}`;
  
  // Estimate tokens
  const estimatedInput = estimateInputTokens('', user);
  const estimatedOutput = estimateOutputTokens('json');
  const totalEstimated = calculateTotalEstimate(estimatedInput, estimatedOutput);
  
  return await moderatorRateLimiter.scheduleRequest(
    async () => {
      return await withRetry(
        async () => {
          const genAI = getClient(true); // Use moderator API key
          const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: {
              maxOutputTokens: 4000,
              temperature: 0.8,
              responseMimeType: "application/json",
            }
          });
          
          const resp = await model.generateContent({ 
            contents: [{ role: "user", parts: [{ text: user }] }] 
          });
          
          // Check if response is complete
          if (!resp.response || !resp.response.candidates || resp.response.candidates.length === 0) {
            throw new Error('Empty or incomplete response from Gemini API');
          }
          
          // Check for safety blocks or truncation
          const candidate = resp.response.candidates[0];
          if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn('[Gemini] moderatorDecideNext unusual finish reason:', candidate.finishReason);
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
              throw new Error(`Response blocked by ${candidate.finishReason} filter`);
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
              console.warn('[Gemini] Moderator response truncated due to MAX_TOKENS');
            }
          }
          
          const actualUsage = extractTokenUsage(resp);
          if (actualUsage) {
            moderatorRateLimiter.reconcileUsage(totalEstimated, actualUsage.totalTokens);
            logTokenUsage(
              'moderatorDecideNext',
              { input: estimatedInput, output: estimatedOutput, total: totalEstimated },
              actualUsage
            );
          }
          
          const text = resp.response.text().trim();
          console.log('[Gemini] moderatorDecideNext raw response length:', text.length, 'chars');
          console.log('[Gemini] moderatorDecideNext raw response:', text);
          
          // Check for empty or truncated response
          if (!text || text.length < 20) {
            throw new Error(`Response too short or empty (${text.length} chars): "${text}"`);
          }
          
          try {
            const parsed = extractJson(text);
            
            // Validate structure
            if (!parsed.nextSpeaker || typeof parsed.nextSpeaker !== 'string') {
              throw new Error('Missing or invalid "nextSpeaker" field');
            }
            if (!parsed.moderatorNotes || typeof parsed.moderatorNotes !== 'string') {
              throw new Error('Missing or invalid "moderatorNotes" field');
            }
            
            return parsed;
          } catch (parseError: any) {
            console.error('[Gemini] moderatorDecideNext parse error:', parseError.message);
            console.error('[Gemini] Raw text:', text);
            throw new Error(`Failed to parse moderator decision JSON: ${parseError.message}`);
          }
        },
        'moderatorDecideNext',
        GEMINI_RETRY_CONFIG
      );
    },
    totalEstimated,
    2 // Normal priority
  );
}

export async function personaRespond(
  persona: { name: string; mcp: MCP },
  whiteboard: Whiteboard,
  history: ConversationTurn[],
  participantInput?: string
): Promise<string> {
  // Show more history to avoid repetition
  const recentHistory = history.slice(-8); // Last 8 turns to see more context
  
  // Extract YOUR previous messages to avoid self-repetition
  const myPreviousMessages = recentHistory
    .filter(t => t.speaker === `AI:${persona.name}`)
    .map(t => t.message.substring(0, 80));
  
  const yourHistory = myPreviousMessages.length > 0
    ? `\n🚫 YOU ALREADY SAID: ${myPreviousMessages.join(' | ')}\nDO NOT REPEAT THESE POINTS.`
    : '';
  
  // Check for human messages in recent history
  const recentHumanMessages = recentHistory.filter(t => t.speaker.startsWith('Human:'));
  const humanContext = recentHumanMessages.length > 0
    ? `\n⚠️ HUMAN INPUT (RESPOND TO THIS): ${recentHumanMessages.map(h => `${h.speaker}: "${h.message.substring(0, 100)}"`).join(' | ')}`
    : '';
  
  const prompt = `You: ${persona.name}
Identity: ${persona.mcp.identity.substring(0, 120)}
${participantInput ? `Your original input: "${participantInput.substring(0, 150)}"` : ''}
${yourHistory}
${humanContext}

Recent discussion: ${recentHistory.map(t => `${t.speaker}: ${t.message.substring(0, 60)}`).join(' | ')}

CRITICAL RULES:
1. CHECK your previous messages above - say something COMPLETELY NEW
2. BUILD ON what others said - find common ground, acknowledge valid points
3. Make CONCESSIONS or COMPROMISES when appropriate - meetings require give-and-take
4. Propose SPECIFIC solutions that integrate multiple viewpoints
5. If you've made your point, SUPPORT others' ideas or add NEW information
6. If stuck, suggest creative alternatives or ask clarifying questions

Max 70 words. Focus on NEW CONTRIBUTIONS not repetition.`;
  
  // Estimate tokens
  const estimatedInput = estimateInputTokens('', prompt);
  const estimatedOutput = estimateOutputTokens('medium');
  const totalEstimated = calculateTotalEstimate(estimatedInput, estimatedOutput);
  
  return await participantRateLimiter.scheduleRequest(
    async () => {
      return await withRetry(
        async () => {
          const genAI = getClient(false); // Use participant API key
          const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: {
              maxOutputTokens: 4000,
              temperature: 0.9,
            }
          });
          
          const resp = await model.generateContent({ 
            contents: [{ role: "user", parts: [{ text: prompt }] }] 
          });
          
          // Check if response is complete
          if (!resp.response || !resp.response.candidates || resp.response.candidates.length === 0) {
            throw new Error('Empty or incomplete response from Gemini API');
          }
          
          // Check for safety blocks or truncation
          const candidate = resp.response.candidates[0];
          if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn('[Gemini] personaRespond unusual finish reason:', candidate.finishReason);
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
              throw new Error(`Response blocked by ${candidate.finishReason} filter`);
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
              console.warn('[Gemini] Persona response truncated due to MAX_TOKENS');
            }
          }
          
          const actualUsage = extractTokenUsage(resp);
          if (actualUsage) {
            participantRateLimiter.reconcileUsage(totalEstimated, actualUsage.totalTokens);
            logTokenUsage(
              'personaRespond',
              { input: estimatedInput, output: estimatedOutput, total: totalEstimated },
              actualUsage
            );
          }
          
          const text = resp.response.text().trim();
          console.log('[Gemini] personaRespond raw response length:', text.length, 'chars');
          console.log('[Gemini] personaRespond raw response:', text.substring(0, 200));
          
          // Check for empty response
          if (!text || text.length === 0) {
            throw new Error('personaRespond returned empty response');
          }
          
          return text;
        },
        'personaRespond',
        GEMINI_RETRY_CONFIG
      );
    },
    totalEstimated,
    2 // Normal priority
  );
}

export async function checkForConclusion(
  moderatorMcp: MCP,
  whiteboard: Whiteboard,
  history: ConversationTurn[]
): Promise<{ conclude: boolean; reason: string }>
{
  const system = `You are analyzing whether a meeting has reached its conclusion.
IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.
Keep your reason under 50 words.`;
  
  // Truncate history to just last 3 turns to reduce input tokens
  const recentHistory = history.slice(-3);
  
  const user = `Check if meeting objectives are met.
MCP Objectives: ${JSON.stringify(moderatorMcp.objectives || [])}
Whiteboard Key Facts: ${JSON.stringify(whiteboard.keyFacts?.slice(0, 5) || [])}
Whiteboard Decisions: ${JSON.stringify(whiteboard.decisions?.slice(0, 5) || [])}
Recent Turns: ${recentHistory.length}

Return ONLY this JSON structure (no markdown):
{ "conclude": boolean, "reason": "brief explanation under 50 words" }`;
  
  // Estimate tokens
  const estimatedInput = estimateInputTokens(system, user);
  const estimatedOutput = estimateOutputTokens('short');
  const totalEstimated = calculateTotalEstimate(estimatedInput, estimatedOutput);
  
  return await moderatorRateLimiter.scheduleRequest(
    async () => {
      return await withRetry(
        async () => {
          const genAI = getClient(true); // Use moderator API key
          const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: {
              maxOutputTokens: 4000,
              temperature: 0.5,
              responseMimeType: "application/json",
            }
          });
          
          const resp = await model.generateContent({ 
            contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }] 
          });
          
          // Check if response is complete
          if (!resp.response || !resp.response.candidates || resp.response.candidates.length === 0) {
            throw new Error('Empty or incomplete response from Gemini API');
          }
          
          // Check for safety blocks or other issues
          const candidate = resp.response.candidates[0];
          if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn('[Gemini] checkForConclusion unusual finish reason:', candidate.finishReason);
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
              throw new Error(`Response blocked by ${candidate.finishReason} filter`);
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
              console.warn('[Gemini] Response truncated due to MAX_TOKENS');
            }
          }
          
          const actualUsage = extractTokenUsage(resp);
          if (actualUsage) {
            moderatorRateLimiter.reconcileUsage(totalEstimated, actualUsage.totalTokens);
            logTokenUsage(
              'checkForConclusion',
              { input: estimatedInput, output: estimatedOutput, total: totalEstimated },
              actualUsage
            );
          }
          
          const text = resp.response.text().trim();
          console.log('[Gemini] checkForConclusion raw response length:', text.length, 'chars');
          console.log('[Gemini] checkForConclusion raw response:', text);
          
          // Check for empty or truncated response
          if (!text || text.length < 10) {
            throw new Error(`Response too short or empty (${text.length} chars): ${text}`);
          }
          
          try {
            const parsed = extractJson(text);
            
            // Validate structure
            if (typeof parsed.conclude !== 'boolean') {
              throw new Error('Missing or invalid "conclude" field');
            }
            if (!parsed.reason || typeof parsed.reason !== 'string') {
              throw new Error('Missing or invalid "reason" field');
            }
            
            return { conclude: parsed.conclude, reason: parsed.reason };
          } catch (parseError: any) {
            console.error('[Gemini] checkForConclusion parse error:', parseError.message);
            console.error('[Gemini] Raw text:', text);
            throw new Error(`Failed to parse conclusion JSON: ${parseError.message}`);
          }
        },
        'checkForConclusion',
        GEMINI_RETRY_CONFIG
      );
    },
    totalEstimated,
    3 // Lower priority
  );
}

export async function summarizeConversation(
  whiteboard: Whiteboard,
  history: ConversationTurn[]
): Promise<{ summary: string; highlights: string[]; decisions: string[]; actionItems: string[]; visualMap: ConversationGraph }>
{
  // Handle edge case: empty or minimal conversation
  if (history.length === 0) {
    return {
      summary: "No conversation took place. The meeting concluded without substantive discussion.",
      highlights: ["Meeting concluded immediately"],
      decisions: [],
      actionItems: [],
      visualMap: { nodes: [], edges: [] }
    };
  }
  
  const system = `Create meeting summary as JSON only.`;
  
  // Limit and simplify conversation data to reduce prompt size
  const recentHistory = history.slice(-10).map(t => ({
    speaker: t.speaker,
    msg: t.message.substring(0, 150) // Truncate long messages
  }));
  
  const user = `Summarize this meeting:
Facts: ${JSON.stringify(whiteboard.keyFacts)}
Decisions: ${JSON.stringify(whiteboard.decisions)}
Actions: ${JSON.stringify(whiteboard.actionItems)}
Turns: ${JSON.stringify(recentHistory)}

JSON only:
{"summary":"100 words","highlights":["point"],"decisions":["decision"],"actionItems":["action"],"visualMap":{"nodes":[],"edges":[]}}`;
  
  // Estimate tokens
  const estimatedInput = estimateInputTokens(system, user);
  const estimatedOutput = estimateOutputTokens('long');
  const totalEstimated = calculateTotalEstimate(estimatedInput, estimatedOutput);
  
  return await moderatorRateLimiter.scheduleRequest(
    async () => {
      return await withRetry(
        async () => {
          const genAI = getClient(true); // Use moderator API key
          const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: {
              maxOutputTokens: 4000,
              temperature: 0.6,
              responseMimeType: "application/json",
            }
          });
          
          const resp = await model.generateContent({ 
            contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }] 
          });
          
          const actualUsage = extractTokenUsage(resp);
          if (actualUsage) {
            moderatorRateLimiter.reconcileUsage(totalEstimated, actualUsage.totalTokens);
            logTokenUsage(
              'summarizeConversation',
              { input: estimatedInput, output: estimatedOutput, total: totalEstimated },
              actualUsage
            );
          }
          
          const text = resp.response.text().trim();
          console.log('[Gemini] summarizeConversation raw response:', text.substring(0, 200));
          
          // Handle empty response
          if (!text || text.length < 10) {
            console.warn('[Gemini] Empty or very short response from summarizeConversation, using fallback');
            return {
              summary: "Meeting concluded with minimal conversation. Unable to generate comprehensive summary.",
              highlights: history.slice(-5).map(t => `${t.speaker}: ${t.message.substring(0, 50)}...`),
              decisions: whiteboard.decisions || [],
              actionItems: whiteboard.actionItems || [],
              visualMap: { nodes: [], edges: [] }
            };
          }
          
          try {
            const parsed = extractJson(text);
            
            // Validate and provide defaults for missing fields
            const validated = {
              summary: parsed.summary || "No summary available",
              highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
              decisions: Array.isArray(parsed.decisions) ? parsed.decisions : (whiteboard.decisions || []),
              actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : (whiteboard.actionItems || []),
              visualMap: (parsed.visualMap && Array.isArray(parsed.visualMap.nodes) && Array.isArray(parsed.visualMap.edges)) 
                ? parsed.visualMap 
                : { nodes: [], edges: [] }
            };
            
            return validated;
          } catch (parseError: any) {
            console.error('[Gemini] summarizeConversation parse error:', parseError.message);
            console.error('[Gemini] Raw text:', text);
            
            // Final fallback: return basic summary from available data
            console.warn('[Gemini] Using fallback summary due to parse error');
            return {
              summary: `Meeting discussion involved ${history.length} conversation turns. Summary generation failed due to parsing error.`,
              highlights: history.slice(-5).map(t => `${t.speaker}: ${t.message.substring(0, 50)}...`),
              decisions: whiteboard.decisions || [],
              actionItems: whiteboard.actionItems || [],
              visualMap: { nodes: [], edges: [] }
            };
          }
        },
        'summarizeConversation',
        GEMINI_RETRY_CONFIG
      );
    },
    totalEstimated,
    0 // Highest priority for final report
  );
}
