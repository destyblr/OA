@echo off
title OA - Scan Epicerie Premium
color 0E
echo ======================================== && echo   SCAN : Epicerie - Premium (30-50EUR) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js epicerie-premium
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
