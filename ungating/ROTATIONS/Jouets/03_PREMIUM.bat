@echo off
title OA - Scan Jouets Premium (30-50â‚¬)
color 0B

echo ========================================
echo   SCAN : Jeux et Jouets - Premium (30-50â‚¬)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0..\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js jouets-premium

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >/dev/null
