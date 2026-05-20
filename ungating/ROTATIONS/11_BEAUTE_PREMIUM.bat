@echo off
title OA - Scan Beaute Premium
color 0E
echo ======================================== && echo   SCAN : Beaute - Premium (30-50EUR) && echo ======================================== && echo.
curl -X POST http://localhost:3000/api/brands/scan -H "Content-Type: application/json" -d "{\"rotationId\": \"beaute-premium\"}"
echo. && echo SCAN LANCE - Dashboard: http://localhost:3000/pages/ungating.html
timeout /t 10 /nobreak
