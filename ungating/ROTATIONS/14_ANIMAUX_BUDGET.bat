@echo off
title OA - Scan Animaux Budget
color 0A
echo ======================================== && echo   SCAN : Animaux - Budget (15-25EUR) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js animaux-budget
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
