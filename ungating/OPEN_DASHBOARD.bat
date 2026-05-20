@echo off
title OA - Ouverture Dashboard
color 0B

echo ========================================
echo   OA - ASIN RENTABLES
echo ========================================
echo.
echo Ouverture du dashboard dans le navigateur...
echo.

timeout /t 2 /nobreak >nul

start http://localhost:3000/pages/asin-rentables.html

echo.
echo Dashboard ouvert !
echo.
timeout /t 3 /nobreak >nul
exit
