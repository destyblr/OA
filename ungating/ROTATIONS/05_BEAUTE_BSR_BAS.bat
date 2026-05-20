@echo off
title OA - Scan Beaute BSR Bas
color 0B
echo ======================================== && echo   SCAN : Beaute - BSR Bas (1-10K) && echo ======================================== && echo.
curl -X POST http://localhost:3000/api/brands/scan -H "Content-Type: application/json" -d "{\"rotationId\": \"beaute-bsr-bas\"}"
echo. && echo SCAN LANCE - Dashboard: http://localhost:3000/pages/ungating.html
timeout /t 10 /nobreak
