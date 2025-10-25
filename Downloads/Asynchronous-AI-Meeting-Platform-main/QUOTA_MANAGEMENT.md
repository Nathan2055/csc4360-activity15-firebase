# API Quota Management Guide

## Current Status: Daily Quota Exhausted ⚠️

You have reached the **250 requests per day** limit for the Gemini API free tier.

### When Does It Reset?
- **Daily quota resets**: Midnight Pacific Time (Los Angeles timezone)
- **Minute quota resets**: Every 60 seconds (10 RPM)

### Free Tier Limits
```
Requests Per Minute (RPM): 10
Tokens Per Minute (TPM):   250,000
Requests Per Day (RPD):    250
```

## How to Check Your Quota

Run this command anytime:
```bash
node check-quota.js
```

## What Caused the Exhaustion?

During development and testing today, we encountered:
1. **Infinite loops** - Personas repeating, moderator stuck selecting "none"
2. **Retry attempts** - Failed requests retrying 4 times each
3. **Persona regeneration bug** - Ken's persona regenerated every turn
4. **Frequent testing** - Multiple meetings created and abandoned

**Estimated breakdown:**
- ~10-15 API calls per meeting turn (moderator + personas + conclusion checks)
- ~10-20 turns per meeting (before fixes)
- ~1-2 meetings created every few minutes during debugging
- **Total**: Easily 250+ requests in a single day

## How to Conserve Quota Going Forward

### 1. Development Mode Settings (Already Applied)
Your `.env` now has:
```bash
DEV_MODE=true
ENGINE_TICK_MS=15000      # Slower loop (15 seconds)
MAX_TURNS_PER_MEETING=10  # Force conclusion after 10 turns
```

### 2. Before Testing
- **Cancel old meetings**: Run `node cleanup-meetings.js`
- **Check quota first**: Run `node check-quota.js`
- **Watch the logs**: Look for warnings like "LOW DAILY QUOTA: Only 20 requests remaining!"

### 3. During Testing
- Test with **ONE meeting at a time**
- Watch for infinite loops - cancel immediately if you see repeated patterns
- Use `Ctrl+C` to stop backend if things go wrong

### 4. Monitoring in Real-Time
The backend now shows warnings:
```
⚠️  [RateLimiter] LOW DAILY QUOTA: Only 20 requests remaining!
⚠️  [RateLimiter] DAILY QUOTA EXHAUSTED! No more API calls until midnight PT.
```

## Fixes Applied to Reduce Quota Usage

### ✅ Fixed Infinite Loops
- **Moderator "none" detection**: Forces conclusion after 2-3 "none" selections
- **Turn limit**: Meetings auto-conclude after 10 turns (configurable)
- **Persona lookup fix**: Personas no longer regenerated every turn

### ✅ Reduced Prompt Sizes
- **Moderator prompt**: Down from ~300 chars to ~150 chars
- **Persona prompt**: Down from ~400 chars to ~200 chars
- **History window**: Reduced from 4 turns to 2 turns

### ✅ Slower Engine Loop
- **Before**: 8 seconds (7.5 calls/minute)
- **After**: 15 seconds (4 calls/minute)
- **Impact**: ~50% reduction in API calls

### ✅ Better Error Handling
- Individual meeting errors no longer crash entire engine loop
- Failed requests properly logged and skipped

## Options to Continue Development

### Option 1: Wait Until Tomorrow (Free)
- Quota resets at midnight PT
- Check time remaining: Run `node check-quota.js`
- Best for: Casual development, no rush

### Option 2: Use Multiple API Keys (Free)
- Create additional Google Cloud projects
- Get new API keys (each has separate 250/day quota)
- Rotate keys in `.env`
- Best for: Extended testing sessions

### Option 3: Upgrade to Paid Tier ($$$)
- **Vertex AI**: 1000+ RPM, much higher daily limits
- **Pay-per-use**: ~$0.001 per request
- Best for: Production use, heavy testing

## Recommended Next Steps

1. **Wait until tomorrow** for quota reset
2. **Test with caution** - One meeting at a time
3. **Monitor quota** - Check remaining requests frequently
4. **Consider upgrade** - If you need to test extensively

## Utility Scripts

```bash
# Check current quota status
node check-quota.js

# Cancel all running meetings
node cleanup-meetings.js

# List all meetings
node list-meetings.js

# View conversation history
node check-conversation.js <meetingId>
```

## Development Mode Benefits

With `DEV_MODE=true` enabled:
- ✅ Slower engine loop (conserves quota)
- ✅ Turn limits prevent runaway meetings
- ✅ Enhanced logging for debugging
- ✅ Warnings when quota is low

## What We Learned Today

1. **Free tier is fragile** - 250 requests goes quickly with bugs
2. **Infinite loops are expensive** - Can burn through quota in minutes
3. **Testing is quota-intensive** - Each meeting uses 50-100 requests
4. **Monitoring is critical** - Need to track usage in real-time

The good news: All the major bugs are now fixed! Tomorrow's testing should be much more efficient.
