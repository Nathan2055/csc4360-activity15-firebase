@echo off
REM A2MP Development Server Startup Script (Windows)
REM This script runs both backend and frontend in parallel

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo A2MP - Asynchronous AI Meeting Platform
echo Development Server Startup
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Package version: %NODE_VERSION%
echo.

REM Backend setup and start
echo Starting Backend Server...
echo    Backend runs on: http://localhost:4000
echo.

cd backend

if not exist "node_modules" (
    echo    Installing backend dependencies...
    call npm install
)

echo    Starting backend...
start "A2MP Backend" cmd /k npm run dev
timeout /t 2 /nobreak

cd ..\FRONTEND

REM Frontend setup and start
echo Starting Frontend Server...
echo    Frontend runs on: http://localhost:3000
echo.

if not exist "node_modules" (
    echo    Installing frontend dependencies...
    call npm install --legacy-peer-deps
)

echo    Starting frontend...
start "A2MP Frontend" cmd /k npm run dev

echo.
echo ==========================================
echo Both servers are starting!
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:4000
echo.
echo The frontend will proxy requests to the
echo backend automatically.
echo ==========================================
echo.

pause

