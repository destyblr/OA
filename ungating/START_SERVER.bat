@echo off
title OA - ASIN Rentables Server
color 0A

echo ========================================
echo   OA - ASIN RENTABLES SERVER
echo ========================================
echo.
echo Demarrage du serveur...
echo.

cd /d "%~dp0backend"

echo [1/2] Verification des packages...
call npm install --silent

echo.
echo [2/2] Demarrage du serveur...
echo.
echo ========================================
echo   SERVER READY
echo   http://localhost:3000
echo ========================================
echo.
echo CRON Job active : Scan quotidien a 9h00
echo.
echo Appuyez sur Ctrl+C pour arreter
echo ========================================
echo.

call npm start

pause
