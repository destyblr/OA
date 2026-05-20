@echo off
title OA - Scan Epicerie Premium
color 0E
echo ======================================== && echo   SCAN : Epicerie - Premium (30-50EUR) && echo ======================================== && echo.
curl -X POST http://localhost:3000/api/brands/scan -H "Content-Type: application/json" -d "{\"rotationId\": \"epicerie-premium\"}"
echo. && echo SCAN LANCE - Dashboard: http://localhost:3000/pages/ungating.html
timeout /t 10 /nobreak
