@echo off
title OA - Scan Beaute BSR Bas
color 0B
echo ======================================== && echo   SCAN : Beaute - BSR Bas (1-10K) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js beaute-bsr-bas
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
