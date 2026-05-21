@echo off
title OA - Scan Beaute BSR Moyen
color 0B
echo ======================================== && echo   SCAN : Beaute - BSR Moyen (10K-30K) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js beaute-bsr-moyen
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
