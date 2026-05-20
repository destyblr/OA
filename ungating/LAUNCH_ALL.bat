@echo off
title OA - ASIN Rentables - Lancement Complet
color 0A

echo ========================================
echo   OA - ASIN RENTABLES
echo   LANCEMENT COMPLET
echo ========================================
echo.
echo [1/3] Verification des packages...
cd /d "%~dp0backend"
call npm install --silent >nul 2>&1

echo [2/3] Demarrage du serveur...
start "OA Server" cmd /k "cd /d %~dp0backend && npm start"

echo [3/3] Attente du serveur (5 secondes)...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   OUVERTURE DU DASHBOARD
echo ========================================
echo.

start http://localhost:3000/pages/asin-rentables.html

echo.
echo ✓ Serveur demarre
echo ✓ Dashboard ouvert dans le navigateur
echo.
echo Pour arreter le serveur, fermez la fenetre "OA Server"
echo.
timeout /t 5 /nobreak >nul
exit
