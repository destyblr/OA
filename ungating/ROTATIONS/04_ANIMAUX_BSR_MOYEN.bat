@echo off
title OA - Scan Animaux BSR Moyen
color 0B
echo ======================================== && echo   SCAN : Animaux - BSR Moyen (10K-30K) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js animaux-bsr-moyen
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
