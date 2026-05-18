@echo off
title OA Scanner - Jouets
cd /d "%~dp0..\backend"
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/start -H "Content-Type: application/json" -d "{\"maxPrice\":20,\"cats\":[\"toys\"]}"
timeout /t 1 /nobreak >nul
start chrome "file:///%~dp0..\frontend\pages\ungating.html"
echo [OK] Scan Jouets lance !
pause
