@echo off
title OA - Scan Jouets BSR Bas (1-10K)
color 0B

echo ========================================
echo   SCAN : Jeux et Jouets - BSR Bas (1-10K)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0..\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js jouets-bsr-bas

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
