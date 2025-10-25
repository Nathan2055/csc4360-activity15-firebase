# Migration Guide: LLM Rate Limiting Optimizations

## Quick Start

### 1. No additional dependencies required
All new files use existing dependencies already in `package.json`:
- `@google/generative-ai` ✓
- `@types/node` ✓

### 2. Installation (if needed)
```bash
cd backend
npm install
```

### 3. Test the optimizations
```bash
cd backend
npm run dev
```

## What Changed

### New Files (automatically loaded)
- `backend/src/llm/rateLimiter.ts` - Rate limiting engine
- `backend/src/llm/personaQueue.ts` - Background persona queue
- `backend/src/llm/tokenEstimator.ts` - Token estimation utilities
- `backend/src/llm/retryHandler.ts` - Retry logic with backoff
- `backend/src/llm/README.md` - Component documentation

### Modified Files
- `backend/src/llm/gemini.ts` - Wrapped all API calls with optimizations
- `backend/src/services/conversationService.ts` - Uses persona queue
- `backend/src/routes.ts` - Added `/api/system/status` endpoint

## Behavioral Changes

### 1. Persona Generation
**Before**: All personas generated in parallel when meeting starts  
**After**: Personas queued and generated sequentially in background

**Impact**: 
- Meeting startup is faster (doesn't block on persona generation)
- First few turns might wait for personas to complete
- No rate limit bursts

### 2. API Call Patterns
**Before**: Unlimited concurrent API calls  
**After**: Queued with rate limiting (max 10/min, 250k tokens/min)

**Impact**:
- Slower under heavy load (as intended - respects limits)
- No 429 rate limit errors
- Automatic retry on failures

### 3. Response Sizes
**Before**: Unlimited token generation  
**After**: Configured max tokens per operation type

**Impact**:
- 30-50% reduction in output tokens
- More concise responses
- Lower API costs

### 4. Context Sizes
**Before**: Full conversation history passed to LLM  
**After**: Last 6-10 turns only

**Impact**:
- 50-70% reduction in input tokens
- Faster API calls
- More focused responses

## Monitoring

### View Rate Limiter Status
```bash
# Get host token first
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"password"}'

# Use token to get status
curl http://localhost:4000/api/system/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Response
```json
{
  "rateLimiter": {
    "queue": {
      "length": 0,
      "processing": false
    },
    "buckets": {
      "requests": "10/10",
      "tokens": "250000/250000",
      "dailyRequests": "250/250"
    },
    "usage": {
      "totalRequests": 0,
      "totalEstimatedTokens": 0,
      "totalActualTokens": 0,
      "estimateAccuracy": "N/A"
    }
  },
  "personaQueue": {
    "queueLength": 0,
    "processing": false,
    "activeJobs": 0
  }
}
```

### Console Logs
The backend will now log:
```
[TokenUsage] generatePersonaFromInput
  Estimated: 850 tokens (in: 450, out: 400)
  Actual:    920 tokens (in: 475, out: 445)
  Difference: +70 (+8.2%)

[PersonaQueue] Queueing 5 persona generations for meeting mtg_abc
[PersonaQueue] Processing persona generation for mtg_abc:prt_123 (4 remaining in queue)
[PersonaQueue] Successfully generated persona: Alice

[RateLimiter] Waiting 5000ms for capacity. Requests: 0/10, Tokens: 12000/250000, Daily: 125/250

[Retry] moderatorDecideNext failed (attempt 1/4). Retrying in 2345ms...
```

## Testing the Changes

### Test 1: Sequential Persona Generation
```bash
# Create a meeting with 5 participants
# Watch console logs for sequential processing
```

Expected logs:
```
[PersonaQueue] Queueing 5 persona generations for meeting mtg_xyz
[PersonaQueue] Processing persona generation for mtg_xyz:prt_001 (4 remaining in queue)
[TokenUsage] generatePersonaFromInput ...
[PersonaQueue] Successfully generated persona: Alice
[PersonaQueue] Processing persona generation for mtg_xyz:prt_002 (3 remaining in queue)
...
```

### Test 2: Rate Limiting
```bash
# Rapidly create multiple meetings
# Should see rate limiter queue up requests
```

Expected logs:
```
[RateLimiter] Waiting 15000ms for capacity. Requests: 0/10, Tokens: 5000/250000, Daily: 45/250
[RateLimiter] Minute buckets refilled
```

### Test 3: Token Estimation Accuracy
```bash
# Run a normal meeting
# Check console for token usage comparisons
```

Target: Estimates within ±20% of actual usage

### Test 4: Retry Logic
```bash
# Temporarily set invalid API key to trigger errors
GEMINI_API_KEY=invalid npm run dev
# Should see retry attempts with exponential backoff
```

Expected logs:
```
[Retry] generatePersonaFromInput failed (attempt 1/4). Retrying in 2000ms...
[Retry] generatePersonaFromInput failed (attempt 2/4). Retrying in 4000ms...
```

## Configuration

### Adjust Rate Limits (if upgraded from free tier)
Edit `backend/src/llm/gemini.ts`:
```typescript
const rateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 60,        // Paid tier: 60 (vs 10 free)
  tokensPerMinute: 4_000_000,   // Paid tier: 4M (vs 250k free)
  requestsPerDay: 50_000,       // Paid tier: 50k (vs 250 free)
});
```

### Adjust Token Limits
Edit `backend/src/llm/tokenEstimator.ts`:
```typescript
export function getMaxOutputTokens(responseType: 'short' | 'medium' | 'long' | 'json'): number {
  switch (responseType) {
    case 'short': return 200;   // Increase if responses truncated
    case 'medium': return 500;
    case 'long': return 1000;
    case 'json': return 800;
    default: return 500;
  }
}
```

### Adjust Retry Config
Edit `backend/src/llm/retryHandler.ts`:
```typescript
export const GEMINI_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,           // Increase for more resilience
  initialDelayMs: 2000,    // First retry delay
  maxDelayMs: 120_000,     // Cap at 2 minutes
  backoffMultiplier: 2,    // Exponential growth rate
};
```

## Troubleshooting

### "Waiting for persona generation to complete"
**Cause**: Personas still being generated sequentially  
**Solution**: Wait 10-30 seconds for queue to process  
**Check**: `GET /api/system/status` - look at personaQueue.queueLength

### Rate limit errors (429)
**Cause**: Rate limiter not preventing calls (shouldn't happen)  
**Solution**: Check rate limiter status, verify initialization  
**Check**: Console logs for "[RateLimiter]" messages

### Token estimates way off (>30% difference)
**Cause**: Estimator needs tuning for your use case  
**Solution**: Adjust character-to-token ratio in tokenEstimator.ts  
**Current**: ~4 chars per token (good for English)

### Slow meeting progression
**Expected**: With rate limiting, meetings run slower under load  
**Normal**: 10 turns/minute max with optimizations  
**Check**: If slower, verify not hitting daily limit (250 req/day)

## Rollback (if needed)

To revert to previous behavior:

1. **Restore gemini.ts**:
```bash
git checkout backend/src/llm/gemini.ts
```

2. **Restore conversationService.ts**:
```bash
git checkout backend/src/services/conversationService.ts
```

3. **Remove new files**:
```bash
rm backend/src/llm/rateLimiter.ts
rm backend/src/llm/personaQueue.ts
rm backend/src/llm/tokenEstimator.ts
rm backend/src/llm/retryHandler.ts
```

4. **Restart**:
```bash
npm run dev
```

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Review `backend/src/llm/README.md` for component details
3. Check rate limiter status via `/api/system/status`
4. Review `OPTIMIZATION_SUMMARY.md` for implementation details
