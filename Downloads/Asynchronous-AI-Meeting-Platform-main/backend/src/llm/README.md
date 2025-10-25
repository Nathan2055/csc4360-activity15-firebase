# LLM Rate Limiting & Optimization

This directory contains the rate limiting, queuing, and optimization infrastructure for Google AI Studio API calls.

## Components

### 1. Rate Limiter (`rateLimiter.ts`)
**Purpose**: Enforce Google AI Studio free tier rate limits with token-aware scheduling.

**Rate Limits**:
- **RPM (Requests Per Minute)**: 10
- **TPM (Tokens Per Minute)**: 250,000
- **RDP (Requests Per Day)**: 250

**Features**:
- Token bucket algorithm with automatic refill
- Priority-based request queue
- Token usage estimation and reconciliation
- Real-time capacity monitoring
- Automatic waiting when limits are approached

**Usage**:
```typescript
const rateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 10,
  tokensPerMinute: 250_000,
  requestsPerDay: 250,
});

// Schedule a request with estimated tokens and priority
const result = await rateLimiter.scheduleRequest(
  async () => {
    // Your API call here
  },
  estimatedTokens,
  priority // 0 = highest, higher numbers = lower priority
);
```

### 2. Persona Queue (`personaQueue.ts`)
**Purpose**: Prevent N parallel LLM calls on meeting start by queueing persona generation.

**Features**:
- Sequential processing of persona generation requests
- Prevents bursting that would exceed TPM limits
- Tracks active jobs to prevent duplicates
- Non-blocking queueing for better UX
- Status monitoring

**Usage**:
```typescript
import { personaQueue } from './personaQueue.js';

// Queue all personas for a meeting (non-blocking)
await personaQueue.queueAllPersonasForMeeting(
  meetingId,
  inputs,
  meetingSubject
);

// Check if ready
const ready = await personaQueue.areAllPersonasReady(meetingId, expectedCount);
```

### 3. Token Estimator (`tokenEstimator.ts`)
**Purpose**: Estimate token usage before API calls for accurate rate limiting.

**Features**:
- Text-based token estimation (~4 chars per token)
- JSON object estimation
- Input/output token calculation
- Max token configuration for different response types
- Actual usage extraction from API responses
- Comparison logging for estimate accuracy

**Usage**:
```typescript
import { 
  estimateInputTokens, 
  estimateOutputTokens, 
  getMaxOutputTokens,
  extractTokenUsage,
  logTokenUsage 
} from './tokenEstimator.js';

// Estimate tokens
const estimatedInput = estimateInputTokens(systemPrompt, userPrompt);
const estimatedOutput = estimateOutputTokens('json');
const totalEstimated = estimatedInput + estimatedOutput;

// Configure API call
const maxTokens = getMaxOutputTokens('json');

// After API call, extract and log actual usage
const actualUsage = extractTokenUsage(response);
if (actualUsage) {
  logTokenUsage('myOperation', {
    input: estimatedInput,
    output: estimatedOutput,
    total: totalEstimated
  }, actualUsage);
}
```

**Response Types**:
- `short`: ~50-100 words (max 200 tokens)
- `medium`: ~150-250 words (max 500 tokens)
- `long`: ~300-500 words (max 1000 tokens)
- `json`: Structured JSON (max 800 tokens)

### 4. Retry Handler (`retryHandler.ts`)
**Purpose**: Handle API errors with exponential backoff and honor Google's retry guidance.

**Features**:
- Automatic retry for transient errors (429, 5xx, network errors)
- Exponential backoff with jitter
- Honors Google's `RetryInfo` from error details
- Honors HTTP `Retry-After` header
- Configurable max retries and delay limits
- Smart error classification

**Usage**:
```typescript
import { withRetry, GEMINI_RETRY_CONFIG } from './retryHandler.js';

const result = await withRetry(
  async () => {
    // Your API call that might fail
  },
  'operationName',
  GEMINI_RETRY_CONFIG // or custom config
);
```

**Default Config**:
- Max retries: 3
- Initial delay: 2000ms
- Max delay: 120,000ms (2 minutes)
- Backoff multiplier: 2

## Integration in gemini.ts

All Gemini API calls are wrapped with:
1. **Token estimation** before the call
2. **Rate limiter scheduling** to respect limits
3. **Retry logic** for transient failures
4. **Max output tokens** configuration
5. **Usage reconciliation** after the call
6. **Logging** for monitoring

Example flow:
```typescript
export async function generatePersonaFromInput(...) {
  // 1. Estimate tokens
  const estimatedInput = estimateInputTokens(system, user);
  const estimatedOutput = estimateOutputTokens('json');
  const totalEstimated = estimatedInput + estimatedOutput;
  
  // 2. Schedule with rate limiter
  return await rateLimiter.scheduleRequest(
    async () => {
      // 3. Wrap in retry logic
      return await withRetry(
        async () => {
          const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: {
              // 4. Set max output tokens
              maxOutputTokens: getMaxOutputTokens('json'),
            }
          });
          
          const resp = await model.generateContent(...);
          
          // 5. Extract and reconcile usage
          const actualUsage = extractTokenUsage(resp);
          if (actualUsage) {
            rateLimiter.reconcileUsage(totalEstimated, actualUsage.totalTokens);
            // 6. Log comparison
            logTokenUsage('generatePersonaFromInput', ...);
          }
          
          return parseResponse(resp);
        },
        'generatePersonaFromInput',
        GEMINI_RETRY_CONFIG
      );
    },
    totalEstimated,
    priority
  );
}
```

## Monitoring

### Rate Limiter Status
```typescript
import { getRateLimiterStatus } from './gemini.js';

const status = getRateLimiterStatus();
console.log(status);
// {
//   queue: { length: 2, processing: true },
//   buckets: {
//     requests: "8/10",
//     tokens: "180000/250000",
//     dailyRequests: "45/250"
//   },
//   usage: {
//     totalRequests: 45,
//     totalEstimatedTokens: 120000,
//     totalActualTokens: 125000,
//     estimateAccuracy: "96.0%"
//   }
// }
```

### Persona Queue Status
```typescript
import { personaQueue } from './personaQueue.js';

const status = personaQueue.getStatus();
console.log(status);
// {
//   queueLength: 3,
//   processing: true,
//   activeJobs: 5
// }
```

### System Status Endpoint
```
GET /api/system/status
Authorization: Bearer <host-token>

Response:
{
  "rateLimiter": { ... },
  "personaQueue": { ... }
}
```

## Optimizations Applied

### 1. Sequential Persona Generation
**Before**: N parallel API calls when meeting starts  
**After**: Queued sequential processing  
**Benefit**: Prevents TPM burst, distributes load over time

### 2. Token-Aware Scheduling
**Before**: No token tracking, just request counting  
**After**: Track both requests and tokens, wait when either limit approached  
**Benefit**: Prevents TPM violations even with varying request sizes

### 3. Max Output Tokens
**Before**: Unlimited response length  
**After**: Configured max tokens per response type  
**Benefit**: Reduces per-call token usage by 30-50%

### 4. History Truncation
**Before**: Entire conversation history passed to LLM  
**After**: Only last N turns passed  
**Benefit**: Reduces input token usage, especially for long meetings

### 5. Usage Reconciliation
**Before**: Estimates could drift from actual usage  
**After**: Token bucket adjusted based on API-reported actual usage  
**Benefit**: Prevents repeated overshoot, more accurate limiting

### 6. Priority Scheduling
**Priorities**:
- 0 (Highest): Final report generation
- 1: Persona generation
- 2: Turn execution (moderator, persona responses)
- 3 (Lowest): Conclusion checks

**Benefit**: Critical operations processed first when queue builds up

### 7. Retry with RetryInfo
**Before**: Fixed retry delays  
**After**: Honors Google's retry guidance from error response  
**Benefit**: Faster recovery, respects provider's rate limit cool-down advice

## Logging

All operations log their token usage:
```
[TokenUsage] generatePersonaFromInput
  Estimated: 850 tokens (in: 450, out: 400)
  Actual:    920 tokens (in: 475, out: 445)
  Difference: +70 (+8.2%)

[RateLimiter] Waiting 5000ms for capacity. Requests: 0/10, Tokens: 12000/250000, Daily: 125/250
[PersonaQueue] Processing persona generation for mtg_abc:prt_123 (2 remaining in queue)
[Retry] moderatorDecideNext failed (attempt 1/4). Retrying in 2345ms...
```

## Best Practices

1. **Always estimate tokens** before scheduling requests
2. **Use appropriate response types** to set correct max tokens
3. **Limit context size** (history, whiteboard) passed to LLM
4. **Monitor rate limiter status** in production
5. **Adjust priorities** based on operation criticality
6. **Review token estimate accuracy** and tune if needed
7. **Set alerts** on daily request limit (250)

## Configuration

Environment variables:
```bash
GEMINI_MODEL=gemini-1.5-pro
GEMINI_API_KEY=your_api_key
```

To adjust rate limits (if upgraded from free tier):
```typescript
const rateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 60,  // Paid tier
  tokensPerMinute: 4_000_000,  // Paid tier
  requestsPerDay: 50_000,  // Paid tier
});
```
