@echo off
chcp 65001 >nul
title Scan Keepa - SEB

cd /d "%~dp0..\..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: SEB
echo ========================================
echo.
echo Categorie: Electromenager
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "SEB" --category="Electromenager" --max-tokens=55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
