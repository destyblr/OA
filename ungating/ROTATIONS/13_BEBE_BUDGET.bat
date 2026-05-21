@echo off
title OA - Scan Bebe Budget
color 0A
echo ======================================== && echo   SCAN : Bebe - Budget (15-25EUR) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js bebe-budget
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
