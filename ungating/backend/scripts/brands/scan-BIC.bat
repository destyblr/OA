@echo off
title OA Scanner - BIC
cd /d "%~dp0..\.."
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/brand -H "Content-Type: application/json" -d "{\"brand\":\"BIC\",\"maxPrice\":10}"
echo [OK] Scan BIC lance !
pause
