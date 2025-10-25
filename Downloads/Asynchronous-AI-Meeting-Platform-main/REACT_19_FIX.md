# React 19 Compatibility Fix

## The Problem
Frontend dependencies have a conflict:
- Frontend requires **React 19.2.0**
- **vaul** component library only supports React 16-18
- This causes npm install to fail with `ERESOLVE` error

## Quick Fix (Already Applied)

The startup scripts now use `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

This tells npm to ignore the peer dependency conflict and proceed anyway.

## Manual Fix (If script doesn't work)

### Option 1: Manual Install (Recommended)
```bash
cd FRONTEND
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run dev
```

### Option 2: Downgrade React to 18
Edit `FRONTEND/package.json`:
```json
"react": "^18",        // Change from "^19"
"react-dom": "^18",    // Change from "^19"
```

Then:
```bash
cd FRONTEND
rm -rf node_modules
npm install
npm run dev
```

### Option 3: One-liner
```bash
cd /Users/alyan/Downloads/Asynchronous-AI-Meeting-Platform-main/FRONTEND && \
rm -rf node_modules package-lock.json && \
npm install --legacy-peer-deps && \
npm run dev
```

## What --legacy-peer-deps Does

- Ignores peer dependency conflicts
- Allows React 19 with vaul (React 16-18 only component)
- Works but should monitor for issues
- Typically safe for development

## If You See Warnings

These are normal:
```
npm warn
npm warn
npm warn It is recommended to use an exact version of vaul
```

Just continue. The app will work fine.

## After Installation

You should see:
```
npm notice
npm notice new packages
✔ Installed 245 packages
```

Then run the app:
```bash
npm run dev
# or use the startup script:
./start-dev.sh
```

## Troubleshooting

### Still getting ERESOLVE error
```bash
# Use force flag (last resort)
npm install --force

# Or use npm 7+ which might handle it better
npm install --legacy-peer-deps --verbose
```

### Module not found errors at runtime
- Try `rm -rf node_modules && npm install --legacy-peer-deps` again
- Check for typos in imports
- Verify React version with: `npm list react`

## Next Steps

Once npm install succeeds, run:
```bash
./start-dev.sh
```

Or manually:
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd ../FRONTEND
npm run dev
```

Then visit: http://localhost:3000

