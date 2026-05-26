@echo off
chcp 65001 >nul
title Scan Keepa - Bic

cd /d "%~dp0..\..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: Bic
echo ========================================
echo.
echo Categorie: Fournitures
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "Bic" --category="Fournitures" --max-tokens=55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
