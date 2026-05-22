@echo off
title Test Keepa API
color 0E

echo ========================================
echo   TEST KEEPA API
echo ========================================
echo.

cd /d "%~dp0\..\backend"
node test-keepa.js

echo.
echo ========================================
echo   FIN DU TEST
echo ========================================
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
