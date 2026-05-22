@echo off
title OA - Scan Jouets BSR Moyen (10K-30K)
color 0B

echo ========================================
echo   SCAN : Jeux et Jouets - BSR Moyen (10K-30K)
echo ========================================
echo.

REM Aller dans le dossier backend
cd /d "%~dp0..\..\backend"

REM Lancer le scan directement (tout s'affiche ici)
node run-scan.js jouets-bsr-moyen

echo.
echo ========================================
echo   FIN
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
