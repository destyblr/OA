@echo off
title OA - Scan High-Tech Premium (30-50â‚¬)
color 0B

echo ========================================
echo   SCAN : High-Tech - Premium (30-50â‚¬)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0..\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js high-tech-premium

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >/dev/null
