# ✅ Node 18 Fix Applied

## The Problem
- Backend uses `better-sqlite3` which requires native compilation
- `better-sqlite3` v9+ doesn't have prebuilt binaries for Node 22 ARM64 (your Mac)
- Node 22 tries to compile it and fails
- **Solution**: Use Node 18 which has prebuilt binaries

## The Solution Applied
```bash
brew link node@18 --force
```

## What This Does
- Switches your system Node from 22.16.0 to 18.20.8
- Allows `better-sqlite3` to use prebuilt binaries instead of compiling
- Backend now starts successfully ✅

## To Verify It's Working
```bash
node --version
# Should show: v18.20.8

curl http://localhost:4000/api/health
# Should show: {"ok":true}
```

## If You Need to Switch Back to Node 22
```bash
brew link node --force
node --version
# Will show: v22.16.0
```

## To Auto-Switch Node Version
Add to your shell profile (`~/.zshrc`):
```bash
# Use Node 18 for A²MP development
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
```

## Quick Restart Script
If your system stops working, run this:
```bash
# Kill processes
pkill -f "npm run dev"
pkill -f "tsx"

# Switch to Node 18
brew link node@18 --force

# Restart everything
cd /Users/alyan/Downloads/Asynchronous-AI-Meeting-Platform-main
./start-dev.sh
```

---

**Status**: ✅ Fixed and running
**Frontend**: http://localhost:3000
**Backend**: http://localhost:4000
**Node Version**: 18.20.8

