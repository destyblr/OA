@echo off
title OA - Scan Beaut?? Budget (15-25???)
color 0B

echo ========================================
echo   SCAN : Beaut?? et Sant?? - Budget (15-25???)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0..\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js beaute-budget

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >/dev/null
