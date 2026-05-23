@echo off
chcp 65001 >nul
title OA - Scanner Automatique

cd /d "%~dp0backend"

echo.
echo ========================================
echo   SCANNER AUTOMATIQUE OA
echo ========================================
echo.
echo Demarrage du scanner automatique...
echo.
echo Ce scanner va tourner en boucle:
echo   - 16 rotations (4 categories)
echo   - 1 scan toutes les ~55 minutes
echo   - Verification tokens avant chaque scan
echo   - Reprise automatique apres arret
echo.
echo Appuyez sur Ctrl+C pour arreter
echo.
echo ========================================
echo.

node auto-scanner.js

pause
