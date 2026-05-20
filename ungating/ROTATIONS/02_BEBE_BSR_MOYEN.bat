@echo off
title OA - Scan Bébé BSR Moyen (10K-30K)
color 0B

echo ========================================
echo   SCAN : Bebe - BSR Moyen (10K-30K)
echo ========================================
echo.
echo Lancement du scan...
echo.

curl -X POST http://localhost:3000/api/brands/scan ^
  -H "Content-Type: application/json" ^
  -d "{\"rotationId\": \"bebe-bsr-moyen\"}"

echo.
echo.
echo ========================================
echo   SCAN LANCE !
echo ========================================
echo.
echo Consulte le dashboard pour voir les resultats
echo http://localhost:3000/pages/ungating.html
echo.
timeout /t 10 /nobreak
