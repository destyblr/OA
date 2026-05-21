@echo off
title OA - Scan Beaute Premium
color 0E
echo ======================================== && echo   SCAN : Beaute - Premium (30-50EUR) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js beaute-premium
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
