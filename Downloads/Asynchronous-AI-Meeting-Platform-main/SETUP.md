# Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies (2 min)
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Step 2: Configure API Key (1 min)
```bash
# Copy the example file
cp backend/.env.example backend/.env

# Open backend/.env and add your Gemini API key
# Get one free at: https://makersuite.google.com/app/apikey
```

Edit `backend/.env`:
```bash
GEMINI_API_KEY=your-actual-key-here
GEMINI_MODERATOR_API_KEY=your-actual-key-here  # Can use same key
```

### Step 3: Start the Server (30 sec)
```bash
npm run dev
```

Wait for:
```
✓ Backend running on http://localhost:4000
✓ Frontend running on http://localhost:5174
```

### Step 4: Create a Test Meeting (1 min)
1. Open http://localhost:5174
2. Click "Host Login"
3. Password: `password`
4. Click "Create Meeting"
5. Fill in:
   - Subject: "Budget Planning Test"
   - Details: "Deciding on Q1 budget allocation"
   - Participant 1: maria@test.com
   - Participant 2: ken@test.com
6. Click "Create Meeting & Invite"

### Step 5: Submit as Participants (30 sec each)
1. Copy participant link from host dashboard
2. Open in new tab (or private window)
3. Participant 1:
   - Name: Maria
   - Input: "I think we should invest heavily in marketing. We need brand awareness to grow."
   - Click Submit
4. Repeat for Participant 2:
   - Name: Ken
   - Input: "We need to stay under $50,000 budget. Efficiency is critical."
   - Click Submit

### Step 6: Watch the Magic! ✨
- Meeting starts automatically
- AI personas discuss and debate
- Watch conversation unfold in real-time
- See decisions being made
- Final report generated when complete

---

## Troubleshooting

### "Cannot find module" errors
```bash
# Make sure you installed all dependencies
npm install --prefix backend
npm install --prefix frontend
```

### "Invalid API key"
- Get a key at https://makersuite.google.com/app/apikey
- Make sure it's in `backend/.env`
- No quotes needed around the key
- Key should start with `AIzaSy...`

### "Meeting not starting"
- Wait 15 seconds (engine tick interval)
- Check both participants submitted
- Look for errors in terminal

### Frontend won't load
- Make sure backend started first
- Check port 4000 isn't in use
- Try http://localhost:5174 (not 5173)

---

## What's Next?

### Learn More
- Read [README.md](README.md) for full documentation
- Check [DEMO_READY_CHECKLIST.md](DEMO_READY_CHECKLIST.md) for polish ideas
- Try different meeting scenarios

### Customize
- Change `ENGINE_TICK_MS` in .env for faster/slower conversations
- Adjust `MAX_TURNS_PER_MEETING` for longer meetings
- Modify persona prompts in `backend/src/llm/gemini.ts`

### Debug
```bash
# View conversation
node check-conversation.js

# List all meetings
node list-meetings.js

# Check database
node check-db.js
```

---

## Common Use Cases to Try

### Budget Planning
- Subject: "Q1 Budget Allocation"
- Participant 1: CFO perspective (cost control)
- Participant 2: CMO perspective (growth investment)

### Product Launch
- Subject: "New Feature Launch Strategy"
- Participant 1: Product manager (user value)
- Participant 2: Engineering lead (technical feasibility)

### Conflict Resolution
- Subject: "Team Process Improvement"
- Participant 1: Developer (focus on code quality)
- Participant 2: Manager (focus on shipping fast)

---

**Need Help?** Check the full README or troubleshooting section!
