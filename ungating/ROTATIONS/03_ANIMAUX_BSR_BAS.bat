@echo off
title OA - Scan Animaux BSR Bas
color 0B
echo ======================================== && echo   SCAN : Animaux - BSR Bas (1-10K) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js animaux-bsr-bas
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
