# Efficiency Protocol for AI Meeting Participants

## Overview
The A²MP platform is designed as an **efficient decision engine**, not a conversational chatbot. All AI agents (personas and moderator) are instructed to eliminate conversational fluff and focus on direct, task-oriented communication.

## Core Protocol Rule
Every AI agent in the system has this rule embedded in their Model Contextual Protocol (MCP):

```
Protocol Rule: Do not use conversational pleasantries, greetings, or verifications 
(e.g., 'Hello,' 'Thank you,' 'That's a great point'). Your response must be direct, 
task-focused, and contain only your core argument or data.
```

## Implementation

### 1. Persona Generation (`generatePersonaFromInput`)
When generating personas from participant input, the LLM is instructed to:
- Include the efficiency protocol rule as the **first rule** in every persona's MCP
- Set `outputFormat` to emphasize concise and direct communication
- Example: `"outputFormat": "How this persona should communicate - concise and direct"`

### 2. Moderator MCP (`conversationService.ts`)
The moderator persona is created with:
- **Identity**: "Meeting Moderator - Efficient Decision Engine"
- **First Rule**: The efficiency protocol (same as above)
- **Output Format**: "Plain text message to the group - direct and concise, no fluff"

### 3. Persona Response Generation (`personaRespond`)
When generating responses, the system prompt explicitly reinforces:
```
CRITICAL: Follow your MCP rules exactly. Do NOT use pleasantries, greetings, or verifications.
Be direct, task-focused, and concise. State only your core argument or data.
```

Additional constraints:
- Max 100 words per response
- "Be direct and concise - no conversational fluff" reminder in prompt

### 4. Token Optimization
The efficiency protocol also helps with API rate limits:
- Shorter responses = fewer output tokens
- More responses fit within the 250,000 TPM limit
- Faster meeting progression

## Examples

### ❌ Inefficient (What We Avoid)
```
Hello everyone! Thank you for that insightful comment, Alice. I really appreciate 
your perspective on this matter. That's a great point about the timeline. I'd like 
to add that we should also consider the budget implications. What do you all think?
```

### ✅ Efficient (What We Want)
```
Budget implications must be addressed. Proposed timeline requires 30% cost increase. 
Alternative: Phase implementation over Q2-Q3 to spread costs.
```

## Benefits

1. **Faster Decisions**: Less time reading unnecessary text
2. **Higher Information Density**: Every word carries meaning
3. **Better Token Efficiency**: Respect API rate limits (10 RPM, 250K TPM)
4. **Professional Tone**: Business-focused, not social
5. **Easier Parsing**: Direct statements are easier for humans and AI to process

## Enforcement Layers

1. **MCP Generation**: Rule embedded at persona creation time
2. **System Prompts**: Reinforced in every API call
3. **Token Limits**: Max 100 words forces brevity
4. **Temperature Settings**: Lower temperatures (0.7-0.9) reduce creative fluff

## Monitoring

To verify the protocol is working:
- Review conversation logs for pleasantries
- Check average response length (should be 50-100 words)
- Monitor token usage (should be ~400 tokens per response)
- User feedback on meeting efficiency

## Future Enhancements

Potential improvements:
- Add a post-processing filter to strip common pleasantries
- Implement a "fluff score" metric in conversation analysis
- Allow hosts to adjust verbosity levels (ultra-concise vs standard)
- Add examples of efficient communication to persona generation prompts
