#!/bin/bash

# A2MP Development Server Startup Script
# This script runs both backend and frontend in parallel

set -e

echo "=========================================="
echo "A2MP - Asynchronous AI Meeting Platform"
echo "Development Server Startup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "📦 Node.js version: $(node --version)"
echo ""

# Backend setup and start
echo "🔧 Starting Backend Server..."
echo "   Backend runs on: http://localhost:4000"
echo ""

cd backend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "   📥 Installing backend dependencies..."
    npm install > /dev/null 2>&1 || npm install
fi

# Start backend in background
npm run dev &
BACKEND_PID=$!
echo "   ✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Wait a moment for backend to start
sleep 2

# Frontend setup and start
echo "🎨 Starting Frontend Server..."
echo "   Frontend runs on: http://localhost:3000"
echo ""

cd ../FRONTEND

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "   📥 Installing frontend dependencies..."
    npm install --legacy-peer-deps > /dev/null 2>&1 || npm install --legacy-peer-deps
fi

# Start frontend
npm run dev &
FRONTEND_PID=$!
echo "   ✅ Frontend started (PID: $FRONTEND_PID)"
echo ""

echo "=========================================="
echo "✨ Both servers are running!"
echo ""
echo "🌐 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:4000"
echo ""
echo "💡 The frontend will proxy requests to the"
echo "   backend automatically."
echo ""
echo "   Press Ctrl+C to stop all servers"
echo "=========================================="
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

