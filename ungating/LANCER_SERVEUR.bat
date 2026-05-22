@echo off
title OA - Serveur Dashboard
color 0A

echo ========================================
echo   SERVEUR DASHBOARD UNGATING
echo ========================================
echo.
echo Le dashboard sera accessible sur:
echo http://localhost:3000/pages/ungating.html
echo.
echo Appuie sur CTRL+C pour arreter le serveur
echo ========================================
echo.

cd /d "%~dp0\backend"
node server.js

pause
