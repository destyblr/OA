@echo off
title OA - Scan Electromenager Budget (15-25€)
color 0B

echo ========================================
echo   SCAN : Électroménager - Budget (15-25€)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js electromenager-budget

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >/dev/null
