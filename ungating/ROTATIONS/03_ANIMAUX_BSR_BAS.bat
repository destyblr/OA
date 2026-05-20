@echo off
title OA - Scan Animaux BSR Bas (1-10K)
color 0B

echo ========================================
echo   SCAN : Animaux - BSR Bas (1-10K)
echo ========================================
echo.
echo Lancement du scan...
echo.

curl -X POST http://localhost:3000/api/brands/scan ^
  -H "Content-Type: application/json" ^
  -d "{\"rotationId\": \"animaux-bsr-bas\"}"

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
