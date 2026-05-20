@echo off
title OA - Scan Bebe Premium
color 0E
echo ======================================== && echo   SCAN : Bebe - Premium (30-50EUR) && echo ======================================== && echo.
curl -X POST http://localhost:3000/api/brands/scan -H "Content-Type: application/json" -d "{\"rotationId\": \"bebe-premium\"}"
echo. && echo SCAN LANCE - Dashboard: http://localhost:3000/pages/ungating.html
timeout /t 10 /nobreak
