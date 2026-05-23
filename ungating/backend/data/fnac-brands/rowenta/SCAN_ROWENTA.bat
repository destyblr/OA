@echo off
chcp 65001 >nul
title Scan Keepa - Rowenta

cd /d "%~dp0..\..\..\backend"

echo.
echo ========================================
echo   SCAN KEEPA: Rowenta
echo ========================================
echo.
echo Categorie: Électroménager
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "Rowenta" --category "Électroménager" --max-tokens 55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
