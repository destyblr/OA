@echo off
title OA - Scan Animaux Premium
color 0E
echo ======================================== && echo   SCAN : Animaux - Premium (30-50EUR) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js animaux-premium
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
