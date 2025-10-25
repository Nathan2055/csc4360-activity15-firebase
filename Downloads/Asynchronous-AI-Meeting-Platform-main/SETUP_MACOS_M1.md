# Setup Guide for macOS M1/M2 with Node v22

## Your System
- Architecture: ARM64 (M1/M2 Mac)
- Node: v22.16.0
- Issue: `better-sqlite3` doesn't have prebuilt binaries for Node 22 ARM64

## Solution: Downgrade Node to v18 or v20

### Option A: Using Homebrew (Recommended)
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node 18 (stable with sqlite3 support)
brew install node@18

# Link it
brew link node@18 --force

# Verify
node --version  # Should be v18.x.x
npm --version   # Should be 9.x or 10.x

# Now go to backend and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install

# Test
npm run dev
```

### Option B: Using NVM (If you prefer version manager)
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
source ~/.nvm/nvm.sh

# Install Node 18
nvm install 18
nvm use 18
nvm alias default 18

# Now go to backend and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install

# Test
npm run dev
```

### Option C: Quick Fix (One-liner)
If you have Homebrew installed:
```bash
brew install node@18 && brew link node@18 --force && cd backend && rm -rf node_modules && npm install && npm run dev
```

## After Installation

Once you have Node 18 installed, run:

```bash
# Single command to start both servers
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

## Verify Everything Works

After running `npm run dev` in backend, you should see:
```
A²MP backend running on http://localhost:4000
```

If you see this, you're good!

## Troubleshooting

### "xcode-select" errors
Run: `xcode-select --install`

### "python3" errors
Run: `brew install python3`

### Still getting sqlite3 errors
```bash
cd backend
npm install --build-from-source
```

## Quick Command to Check Current Setup
```bash
echo "Node: $(node --version)"
echo "npm: $(npm --version)" 
echo "Arch: $(arch)"
```

If Node is v22+, follow Option A or B above.

