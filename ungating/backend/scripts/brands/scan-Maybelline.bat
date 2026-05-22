@echo off
title OA Scanner - Maybelline
cd /d "%~dp0..\.."
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/brand -H "Content-Type: application/json" -d "{\"brand\":\"Maybelline\",\"maxPrice\":10}"
echo [OK] Scan Maybelline lance !
pause
