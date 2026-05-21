@echo off
title OA Scanner - Bebe
cd /d "%~dp0..\backend"
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/start -H "Content-Type: application/json" -d "{\"maxPrice\":20,\"cats\":[\"baby\"]}"
echo [OK] Scan Bebe lance !
pause
