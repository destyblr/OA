@echo off
title OA - Scan High-Tech BSR Bas (1-10K)
color 0B

echo ========================================
echo   SCAN : High-Tech - BSR Bas (1-10K)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0..\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js high-tech-bsr-bas

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
