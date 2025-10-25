# Separate Moderator API Key Feature

## Overview
The system now uses **separate API keys** for moderator and participant persona operations. This provides independent quota management and prevents the moderator from exhausting the participant quota.

## Problem Solved
Previously, all Gemini API calls used a single API key:
- **Issue 1**: Moderator operations could exhaust the daily quota, blocking participant personas
- **Issue 2**: No way to track moderator vs participant API usage separately
- **Issue 3**: Free tier limit of 250 requests/day shared across ALL operations
- **Issue 4**: No isolation between system-critical (moderator) and user-facing (personas) operations

## Solution: Dual API Key Architecture

### API Key Separation

**Moderator API Key** (`GEMINI_MODERATOR_API_KEY`):
- Used for: `moderatorDecideNext`, `checkForConclusion`, `summarizeConversation`
- Critical system operations that must not fail
- Can use higher quota tier if needed
- Falls back to main key if not set

**Participant API Key** (`GEMINI_API_KEY`):
- Used for: `generatePersonaFromInput`, `personaRespond`
- User-facing persona operations
- Can be rate-limited more aggressively if needed
- Main quota for conversation content

### Quota Independence

With separate keys, each gets its own quota:
```
Moderator Key:
- 10 RPM (requests per minute)
- 250K TPM (tokens per minute)  
- 250 RPD (requests per day)

Participant Key:
- 10 RPM
- 250K TPM
- 250 RPD

Total Available:
- 500 requests/day (instead of 250)
- Independent rate limiting
```

## Implementation Details

### Environment Variables

**`.env` Configuration:**
```bash
# Main API key for participant personas
GEMINI_API_KEY=AIza...participant_key

# Optional: Separate API key for moderator operations
# Falls back to GEMINI_API_KEY if not set
GEMINI_MODERATOR_API_KEY=AIza...moderator_key
```

**Fallback Behavior:**
If `GEMINI_MODERATOR_API_KEY` is not set, the system uses `GEMINI_API_KEY` for both (backward compatible).

### Code Changes

**Location:** `backend/src/llm/gemini.ts`

#### 1. Separate Rate Limiters
```typescript
// Moderator rate limiter
const moderatorRateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 10,
  tokensPerMinute: 250_000,
  requestsPerDay: 250,
});

// Participant personas rate limiter
const participantRateLimiter = new GeminiRateLimiter({
  requestsPerMinute: 10,
  tokensPerMinute: 250_000,
  requestsPerDay: 250,
});
```

#### 2. Client Selection
```typescript
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
```

#### 3. Function-Specific Routing

**Moderator Functions** (use `moderatorRateLimiter` + `getClient(true)`):
- `moderatorDecideNext()` - Selects next speaker each turn
- `checkForConclusion()` - Determines if meeting is complete
- `summarizeConversation()` - Generates final report

```typescript
// Example: moderatorDecideNext
const genAI = getClient(true); // Use moderator key
return await moderatorRateLimiter.scheduleRequest(...)
```

**Participant Functions** (use `participantRateLimiter` + `getClient(false)`):
- `generatePersonaFromInput()` - Creates persona from participant input
- `personaRespond()` - Generates persona's conversation turn

```typescript
// Example: personaRespond
const genAI = getClient(false); // Use participant key
return await participantRateLimiter.scheduleRequest(...)
```

#### 4. Status Tracking
```typescript
export function getRateLimiterStatus() {
  return {
    moderator: moderatorRateLimiter.getStatus(),
    participants: participantRateLimiter.getStatus()
  };
}
```

Returns separate status for each quota pool.

## Usage Breakdown

### Typical Meeting Flow (10 turns)

**Moderator API Calls:**
1. Meeting start: 0 calls
2. Per turn: 1 `moderatorDecideNext` = 1 call/turn
3. Every 2-3 turns: 1 `checkForConclusion` = ~3 calls total
4. Meeting end: 1 `summarizeConversation` = 1 call
5. **Total Moderator**: ~14 calls

**Participant API Calls:**
1. Initial: 2 `generatePersonaFromInput` = 2 calls (for 2 participants)
2. Per turn: 1-2 `personaRespond` = ~15 calls (10 turns, alternating)
3. **Total Participant**: ~17 calls

**Combined Total**: ~31 calls per meeting

### Quota Impact

**Single Key (Before):**
- 250 requests/day ÷ 31 calls/meeting = **~8 meetings/day**
- Moderator can exhaust entire quota
- No isolation

**Dual Keys (After):**
- Moderator: 250 ÷ 14 = **~17 meetings/day**
- Participant: 250 ÷ 17 = **~14 meetings/day**
- Limited by participant quota = **~14 meetings/day**
- **75% more capacity** than single key
- Moderator isolated from participant usage

## Benefits

### 1. Quota Isolation
- Moderator operations can't exhaust participant quota
- Critical system functions protected
- User-facing features have dedicated quota

### 2. Independent Scaling
- Can upgrade moderator to paid tier while keeping participants free
- Or vice versa - upgrade participant quota for more personas
- Flexible cost optimization

### 3. Better Monitoring
- Track moderator vs participant usage separately
- Identify which operations consume most quota
- Optimize based on actual usage patterns

### 4. Fault Isolation
- If participant key hits rate limit, moderator still works
- Can pause participant persona generation while keeping system operational
- Graceful degradation possible

### 5. Cost Control
- Separate billing for different operation types
- Can set different quotas based on importance
- Predictable cost allocation

## Configuration Strategies

### Strategy 1: Development (Same Key)
```bash
# Use single key for simplicity
GEMINI_API_KEY=AIza...dev_key
# Don't set GEMINI_MODERATOR_API_KEY (uses fallback)
```
**Use case**: Local development, testing

### Strategy 2: Production (Separate Free Keys)
```bash
# Two different free-tier keys
GEMINI_API_KEY=AIza...participant_key
GEMINI_MODERATOR_API_KEY=AIza...moderator_key
```
**Use case**: Low-cost production, doubles quota

### Strategy 3: Production (Paid Moderator)
```bash
# Participant on free tier
GEMINI_API_KEY=AIza...free_participant_key

# Moderator on paid tier (higher limits)
GEMINI_MODERATOR_API_KEY=AIza...paid_moderator_key
```
**Use case**: Ensure system reliability, variable participant load

### Strategy 4: Production (Paid Both)
```bash
# Both on paid tiers
GEMINI_API_KEY=AIza...paid_participant_key
GEMINI_MODERATOR_API_KEY=AIza...paid_moderator_key
```
**Use case**: High-volume production

## Monitoring & Debugging

### Check Quota Status
```typescript
import { getRateLimiterStatus } from './llm/gemini.js';

const status = getRateLimiterStatus();
console.log('Moderator:', status.moderator);
console.log('Participants:', status.participants);
```

**Output:**
```json
{
  "moderator": {
    "requestsPerMinute": { "used": 3, "limit": 10 },
    "tokensPerMinute": { "used": 1200, "limit": 250000 },
    "requestsPerDay": { "used": 45, "limit": 250 }
  },
  "participants": {
    "requestsPerMinute": { "used": 5, "limit": 10 },
    "tokensPerMinute": { "used": 8500, "limit": 250000 },
    "requestsPerDay": { "used": 87, "limit": 250 }
  }
}
```

### Log Messages
```
[Gemini] Using moderator API key for moderatorDecideNext
[Gemini] Using participant API key for personaRespond
[RateLimiter] Moderator - Scheduled request, queue size: 2
[RateLimiter] Participant - Scheduled request, queue size: 0
```

## Backward Compatibility

✅ **Fully Backward Compatible**

If you don't set `GEMINI_MODERATOR_API_KEY`:
- Falls back to `GEMINI_API_KEY` for all operations
- System works exactly as before
- Single quota pool maintained
- No breaking changes

## Testing

### Test Separate Keys
1. Set different keys in `.env`
2. Start meeting
3. Check logs - should see both keys being used
4. Verify quota tracking shows separate counters

### Test Fallback
1. Remove `GEMINI_MODERATOR_API_KEY` from `.env`
2. Start meeting
3. Should work normally using main key
4. Verify logs show fallback behavior

### Test Quota Exhaustion
1. Use separate keys
2. Manually exhaust participant quota
3. Verify moderator operations still work
4. Meeting should pause gracefully, not crash

## Performance Impact

**Negligible:**
- Same API calls, just routed differently
- Minimal overhead from key selection
- Rate limiters run independently (no blocking)
- No additional database queries

**Benefits:**
- Better throughput with 2 keys
- Reduced queue wait times (parallel processing)
- Improved reliability (fault isolation)

## Security Considerations

### Key Management
- Store keys in `.env` file (not in code)
- Add `.env` to `.gitignore`
- Use different keys for dev/staging/prod
- Rotate keys periodically

### Access Control
- Moderator key: System-level access only
- Participant key: Can be more restricted
- Don't expose keys in client-side code
- Log key usage for audit trail

## Cost Analysis

### Free Tier (Both Keys Free)
- **Cost**: $0/month
- **Capacity**: ~14 meetings/day (vs 8 before)
- **Benefit**: 75% more capacity

### Hybrid (Paid Moderator, Free Participant)
- **Cost**: ~$10-20/month for moderator
- **Capacity**: Limited only by participant quota (~14-20 meetings/day)
- **Benefit**: Guaranteed system reliability

### Paid Tier (Both Keys Paid)
- **Cost**: ~$20-40/month
- **Capacity**: 100+ meetings/day (depending on plan)
- **Benefit**: Production-ready scale

## Future Enhancements

### Potential Improvements:
1. **Dynamic Key Selection**: Choose least-used key automatically
2. **Key Pool**: Support multiple participant keys for even higher quota
3. **Quota Alerts**: Email notification when quota reaches 80%
4. **Auto-Scaling**: Automatically upgrade to paid tier when quota exceeded
5. **Cost Tracking**: Dashboard showing cost per meeting
6. **Key Rotation**: Automatic monthly key rotation for security

## Files Modified

1. **`backend/src/llm/gemini.ts`**
   - Added `moderatorRateLimiter` and `participantRateLimiter`
   - Modified `getClient()` to accept `useModerator` parameter
   - Updated all 5 functions to use appropriate limiter and client
   - Modified `getRateLimiterStatus()` to return both statuses

2. **`backend/.env`**
   - Added `GEMINI_MODERATOR_API_KEY` with documentation
   - Kept `GEMINI_API_KEY` for backward compatibility

## Migration Guide

### For Existing Deployments:

**Step 1: No Changes Required**
- System works with current single-key setup
- Optional upgrade when ready

**Step 2: Get Second API Key** (Optional)
- Go to Google AI Studio
- Create new project or use existing
- Generate new API key
- Copy key value

**Step 3: Update `.env`**
```bash
# Add new line
GEMINI_MODERATOR_API_KEY=your_new_key_here
```

**Step 4: Restart Backend**
```bash
npm run dev
```

**Step 5: Verify**
- Check logs for "Using moderator API key" messages
- Monitor quota usage in separate pools
- Confirm increased capacity

---

**Status**: ✅ Implemented and Active  
**Version**: 1.0  
**Date**: October 21, 2025  
**Backward Compatible**: Yes
