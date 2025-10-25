#!/bin/bash

echo "🔍 A2MP Diagnostic Check"
echo "======================="
echo ""

echo "1️⃣  Checking ports..."
echo "   Port 3000 (Frontend):"
lsof -i :3000 2>/dev/null | tail -1 || echo "      Not running"

echo "   Port 4000 (Backend):"
lsof -i :4000 2>/dev/null | tail -1 || echo "      Not running"

echo ""
echo "2️⃣  Checking Node version..."
node --version

echo ""
echo "3️⃣  Checking if frontend build exists..."
if [ -d "FRONTEND/.next" ]; then
  echo "   ✓ .next build exists"
else
  echo "   ✗ .next build NOT found"
fi

echo ""
echo "4️⃣  Checking backend database..."
if [ -f "backend/backend/data/a2mp.db" ]; then
  echo "   ✓ Database exists"
  ls -lh backend/backend/data/a2mp.db
else
  echo "   ✗ Database NOT found"
fi

echo ""
echo "5️⃣  Testing connectivity..."
echo "   Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'ERROR')"
echo "   Backend:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/api/health || echo 'ERROR')"

echo ""
echo "6️⃣  Frontend .env.local:"
if [ -f "FRONTEND/.env.local" ]; then
  cat FRONTEND/.env.local
else
  echo "   NOT FOUND"
fi

echo ""
echo "Done!"

