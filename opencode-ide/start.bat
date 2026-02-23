@echo off
cd /d "%~dp0"

echo Killing existing processes...
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo Cleaning lock files...
rmdir /s /q "out\dev" 2>nul

echo Starting Next.js dev server...
start "" cmd /c "npm run dev"

echo Waiting for Next.js to start (15 seconds)...
ping -n 15 127.0.0.1 >nul

echo Starting Electron...
npx cross-env NODE_ENV=development COPILOT_BRIDGE_NODE_PATH=C:\nvm4w\nodejs\node.exe npx electron .
