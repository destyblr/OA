@echo off
title OA - Scan Electromenager Budget (15-25â‚¬)
color 0B

echo ========================================
echo   SCAN : Ã‰lectromÃ©nager - Budget (15-25â‚¬)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0..\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js electromenager-budget

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >/dev/null
