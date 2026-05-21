@echo off
title OA - Scan Epicerie Budget
color 0A
echo ======================================== && echo   SCAN : Epicerie - Budget (15-25EUR) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js epicerie-budget
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
