@echo off
title OA - Scan Beaute Budget
color 0A
echo ======================================== && echo   SCAN : Beaute - Budget (15-25EUR) && echo ======================================== && echo.
curl -X POST http://localhost:3000/api/brands/scan -H "Content-Type: application/json" -d "{\"rotationId\": \"beaute-budget\"}"
echo. && echo SCAN LANCE - Dashboard: http://localhost:3000/pages/ungating.html
timeout /t 10 /nobreak
