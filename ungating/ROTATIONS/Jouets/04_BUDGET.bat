@echo off
title OA - Scan Jouets Budget (15-25â‚¬)
color 0B

echo ========================================
echo   SCAN : Jeux et Jouets - Budget (15-25â‚¬)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0..\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js jouets-budget

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >/dev/null
