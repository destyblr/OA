@echo off
title OA - Scan Beaute Budget
color 0A
echo ======================================== && echo   SCAN : Beaute - Budget (15-25EUR) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js beaute-budget
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
