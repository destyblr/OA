@echo off
title OA Scanner - Stabilo
cd /d "%~dp0..\.."
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/brand -H "Content-Type: application/json" -d "{\"brand\":\"Stabilo\",\"maxPrice\":10}"
echo [OK] Scan Stabilo lance !
pause
