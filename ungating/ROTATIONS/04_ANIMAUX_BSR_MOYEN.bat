@echo off
title OA - Scan Animaux BSR Moyen (10K-30K)
color 0B
echo ========================================
echo   SCAN : Animaux - BSR Moyen (10K-30K)
echo ========================================
echo.
echo Lancement du scan...
echo.
curl -X POST http://localhost:3000/api/brands/scan -H "Content-Type: application/json" -d "{\"rotationId\": \"animaux-bsr-moyen\"}"
echo.
echo ========================================
echo   SCAN LANCE !
echo ========================================
echo Consulte le dashboard : http://localhost:3000/pages/ungating.html
timeout /t 10 /nobreak
