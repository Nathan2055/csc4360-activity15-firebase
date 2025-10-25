# Fix for better-sqlite3 Build Error on macOS

## The Issue
The backend uses `better-sqlite3` which requires native compilation. Your system needs proper build tools.

## Quick Fixes (Try in order)

### Option 1: Accept the developer license (EASIEST)
```bash
sudo xcode-select --install
sudo xcode-select --switch /Library/Developer/CommandLineTools
sudo xcodebuild -license accept
```

### Option 2: Use Homebrew (if installed)
```bash
brew install python3
npm install --python=$(which python3)
```

### Option 3: Skip native build and use prebuilt (FASTEST)
```bash
cd backend
npm install --ignore-scripts
npm run dev
```

The prebuilt `better-sqlite3` should work for your system. If it doesn't, try Option 4.

### Option 4: Use Node version manager (NVM)
```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Use a stable node version
nvm install 18
nvm use 18

# Try npm install again
cd backend
npm install
```

## Recommended Solution for You

Run this:
```bash
cd /Users/alyan/Downloads/Asynchronous-AI-Meeting-Platform-main/backend
npm install --ignore-scripts
npm run dev
```

If that works, you're good! The ignore-scripts flag skips the native compilation, and the prebuilt binaries will be used instead.

## If Still Having Issues

Try this one-liner that usually works on M1/M2 Macs:
```bash
cd backend && ARCHFLAGS=-Wno-error=unused-command-line-argument-hard-error-in-future npm install
```

## Verify It Works

Once npm install succeeds, run:
```bash
npm run dev
# You should see: "A²MP backend running on http://localhost:4000"
```

Then in another terminal:
```bash
cd ../FRONTEND
npm run dev
```

Or use the single command script we created.

