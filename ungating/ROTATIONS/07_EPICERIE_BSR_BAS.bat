@echo off
title OA - Scan Epicerie BSR Bas
color 0B
echo ======================================== && echo   SCAN : Epicerie - BSR Bas (1-10K) && echo ======================================== && echo.
cd /d "%~dp0\..\backend"
node run-scan.js epicerie-bsr-bas
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
