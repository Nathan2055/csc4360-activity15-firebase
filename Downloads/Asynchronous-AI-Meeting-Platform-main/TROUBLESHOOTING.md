# A2MP Troubleshooting Guide

## Build Errors

### Error: "better-sqlite3" build fails
**Cause:** Node 22 + ARM64 doesn't have prebuilt binaries

**Solution:**
```bash
# Downgrade to Node 18 (has full support)
brew install node@18
brew link node@18 --force

# Verify
node --version  # Should show v18.x

# Reinstall
cd backend
rm -rf node_modules
npm install
```

### Error: "xcode-select" not found or broken
**Solution:**
```bash
xcode-select --install
# Wait for installation to complete
```

### Error: "python3" not found
**Solution:**
```bash
# If using Homebrew
brew install python3

# Or download from: python.org
# Make sure it's in your PATH
which python3
```

---

## Runtime Errors

### Backend won't start
```
npm error code ENOENT
npm error path /path/to/backend/node_modules/better-sqlite3
```

**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Frontend can't reach backend
```
Error: Failed to fetch http://localhost:4000/api/...
```

**Solution:**
1. Check backend is running: `curl http://localhost:4000/api/health`
2. Check ports are correct:
   - Backend: 4000
   - Frontend: 3000
3. Check `.env.local` has: `NEXT_PUBLIC_API_BASE=http://localhost:3000/api/proxy`

### "Address already in use" error
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using the port
lsof -i :3000  # Or :4000

# Kill it
kill -9 <PID>

# Or change ports in:
# Backend: .env -> PORT
# Frontend: next.config.js -> devServer.port
```

---

## Login Issues

### "Login failed" error
**Check:**
1. Backend is running (`npm run dev` in backend)
2. Password is correct (check backend `.env`)
3. Try simple password first (e.g., "password" or "test")

### "Invalid token" error
**Check:**
1. Token was stored correctly
2. Check browser localStorage:
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Look for `authToken`

---

## API/Network Issues

### Proxy not working
**Check:**
1. File exists: `FRONTEND/app/api/proxy/[...path]/route.ts`
2. Try direct backend: Change `.env.local` to `NEXT_PUBLIC_API_BASE=http://localhost:4000`
3. Check network tab in DevTools

### CORS errors
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
Check backend `.env` has:
```
CORS_ORIGIN=http://localhost:3000
```

### Headers not being sent
**Check:**
1. Auth token exists in localStorage
2. Fetch includes headers:
   ```javascript
   headers: { 'Authorization': `Bearer ${token}` }
   ```

---

## Database Issues

### "Database locked" error
```
Error: database is locked
```

**Solution:**
```bash
cd backend
# Close any open connections
pkill -f "npm run dev"

# Wait 2 seconds
sleep 2

# Delete and restart
rm -f backend/data/a2mp.db

npm run dev
```

### "Database corrupted" error
**Solution:**
```bash
cd backend

# Backup old database
cp backend/data/a2mp.db backend/data/a2mp.db.bak

# Delete corrupted database
rm backend/data/a2mp.db

# Restart backend (fresh database will be created)
npm run dev
```

---

## Frontend Issues

### Page shows blank/white screen
**Check:**
1. DevTools Console (F12) for errors
2. Network tab - check API calls
3. Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Styling not loading
**Solution:**
```bash
cd FRONTEND
npm run dev

# Or clear cache:
rm -rf .next
npm run dev
```

### Hot reload not working
**Solution:**
```bash
cd FRONTEND
rm -rf node_modules .next
npm install
npm run dev
```

---

## Performance Issues

### Backend slow/unresponsive
**Check:**
1. CPU/Memory usage: `top` or Activity Monitor
2. Database file size: `ls -lh backend/data/a2mp.db`
3. Try restart:
   ```bash
   pkill -f "npm run dev"
   cd backend
   npm run dev
   ```

### Frontend slow
**Check:**
1. Browser DevTools Performance tab
2. Check for large bundle sizes
3. Try hard refresh

---

## Complete Reset (Nuclear Option)

If everything is broken:

```bash
# Stop all servers
pkill -f "npm run dev"
pkill -f "npm"

# Go to project root
cd /Users/alyan/Downloads/Asynchronous-AI-Meeting-Platform-main

# Clean everything
cd backend
rm -rf node_modules package-lock.json
rm -f backend/data/a2mp.db
cd ../FRONTEND
rm -rf node_modules .next
cd ..

# Check Node version (should be 18+)
node --version

# Reinstall everything
cd backend
npm install
cd ../FRONTEND
npm install

# Start fresh
cd ..
./start-dev.sh
```

---

## Getting Help

1. **Check this file first** - Most issues are here
2. **Check error message carefully** - Google the exact error
3. **Check DevTools** - Open F12, look at Console and Network tabs
4. **Check process status**:
   ```bash
   curl http://localhost:4000/api/health
   curl http://localhost:3000
   ```

---

## Quick Diagnostics Command

Run this to check your setup:
```bash
echo "=== System ===" && \
echo "Node: $(node --version)" && \
echo "npm: $(npm --version)" && \
echo "Arch: $(arch)" && \
echo "=== Backend ===" && \
curl -s http://localhost:4000/api/health | jq . || echo "Backend not running" && \
echo "=== Frontend ===" && \
curl -s http://localhost:3000 | head -5 || echo "Frontend not running"
```

---

## Still Need Help?

1. Check `/INTEGRATION_ANALYSIS.md` for API reference
2. Check `/BACKEND_INTEGRATION_SUMMARY.md` for quick lookup
3. Review `/backend/src/routes.ts` for endpoint definitions
4. Look at old frontend: `/frontend OLD:CURRENT/src/pages/` for working examples

