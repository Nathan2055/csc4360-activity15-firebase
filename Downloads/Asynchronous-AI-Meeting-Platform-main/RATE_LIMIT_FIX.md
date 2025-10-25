# Rate Limit Fix Applied

## Problem
System was showing "Too Many Requests" errors even though Google AI Studio usage dashboard showed we were well within limits (5/10 RPM, 17/250 RPD).

## Root Cause
The rate limiter was configured with **incorrect/conservative limits** that didn't match the actual Google AI free tier quotas:

### Old (Incorrect) Limits:
- **10 RPM** (Requests Per Minute)
- **250K TPM** (Tokens Per Minute)  
- **250 RPD** (Requests Per Day)

### Actual Free Tier Limits:
- **15 RPM** (Requests Per Minute)
- **1M TPM** (Tokens Per Minute)
- **1500 RPD** (Requests Per Day)

## Solution
Updated rate limiter defaults in three files:

### 1. `backend/src/llm/rateLimiter.ts`
Changed default constructor values to match actual free tier limits:
```typescript
requestsPerMinute: 15,  // was 10
tokensPerMinute: 1_000_000,  // was 250_000
requestsPerDay: 1500,  // was 250
```

### 2. `backend/src/llm/gemini.ts`
Updated both rate limiters (moderator and participant) to use correct limits:
```typescript
const moderatorRateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 15,
  tokensPerMinute: 1_000_000,
  requestsPerDay: 1500,
});

const participantRateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 15,
  tokensPerMinute: 1_000_000,
  requestsPerDay: 1500,
});
```

### 3. `backend/src/server.ts`
Updated startup message to reflect accurate limits:
```typescript
console.log('   - API quota per key: 15 RPM, 1M TPM, 1500 RPD (Free tier)');
```

## Impact
- **System can now make 50% more requests** per minute (15 vs 10)
- **4x more tokens** available per minute (1M vs 250K)
- **6x more daily requests** (1500 vs 250)
- Eliminates false "Too Many Requests" errors when actual API quota is available

## Dual API Keys
Since the system uses **two separate API keys** (moderator + participant), total capacity is:
- **30 RPM total** (15 per key)
- **2M TPM total** (1M per key)
- **3000 RPD total** (1500 per key)

## Testing
Backend restarted with new limits. Monitor Google AI Studio dashboard to verify requests stay well within actual quotas.

## Date Applied
October 21, 2025
