@echo off
chcp 65001 >nul
title Scan Keepa - Tefal

cd /d "%~dp0..\..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: Tefal
echo ========================================
echo.
echo Categorie: Electromenager
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "Tefal" --category="Electromenager" --max-tokens=55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
