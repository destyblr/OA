@echo off
title OA Scanner - Alimentation
cd /d "%~dp0..\backend"
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/start -H "Content-Type: application/json" -d "{\"maxPrice\":20,\"cats\":[\"grocery\"]}"
echo [OK] Scan Alimentation lance !
pause
