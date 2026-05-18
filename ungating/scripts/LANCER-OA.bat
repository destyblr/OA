@echo off
title OA Ungating Scanner

echo.
echo ======================================
echo   OA UNGATING SCANNER
echo ======================================
echo.
echo [1/2] Demarrage du backend...

cd /d "%~dp0backend"
start /B node server.js

echo [2/2] Attente du serveur (3s)...
timeout /t 3 /nobreak >nul

echo.
echo [OK] Backend demarre !
echo [OK] Ouverture du dashboard...
echo.

start chrome "file:///%~dp0frontend\pages\ungating.html"

echo.
echo ======================================
echo   APPLICATION LANCEE !
echo ======================================
echo.
echo Le backend tourne en arriere-plan.
echo Pour l'arreter : fermez cette fenetre
echo.
echo NE FERMEZ PAS cette fenetre pendant
echo que vous utilisez l'application !
echo ======================================
echo.

pause
