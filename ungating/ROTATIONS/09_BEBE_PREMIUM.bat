@echo off
title OA - Scan Bebe Premium
color 0E
echo ======================================== && echo   SCAN : Bebe - Premium (30-50EUR) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js bebe-premium
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
