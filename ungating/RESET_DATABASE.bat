@echo off
title OA - Reset Database
color 0C

echo ========================================
echo   RESET BASE DE DONNEES
echo ========================================
echo.
echo ATTENTION: Ceci va supprimer TOUTES les donnees:
echo   - Tous les ASIN
echo   - Toutes les marques
echo   - Tout l'historique des scans
echo.
echo ========================================
echo.

pause

cd /d "%~dp0\backend"
node reset-database.js

echo.
pause
