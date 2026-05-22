@echo off
title OA Scanner - Melissa & Doug
cd /d "%~dp0..\.."
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/brand -H "Content-Type: application/json" -d "{\"brand\":\"Melissa & Doug\",\"maxPrice\":10}"
echo [OK] Scan Melissa & Doug lance !
pause
