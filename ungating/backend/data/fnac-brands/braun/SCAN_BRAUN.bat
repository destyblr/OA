@echo off
chcp 65001 >nul
title Scan Keepa - Braun

cd /d "%~dp0..\..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: Braun
echo ========================================
echo.
echo Categorie: Beaute
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "Braun" --category="Beaute" --max-tokens=55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
