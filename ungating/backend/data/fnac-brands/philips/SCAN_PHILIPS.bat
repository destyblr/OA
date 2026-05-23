@echo off
chcp 65001 >nul
title Scan Keepa - Philips

cd /d "%~dp0..\..\..\backend"

echo.
echo ========================================
echo   SCAN KEEPA: Philips
echo ========================================
echo.
echo Categorie: Électroménager
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "Philips" --category "Électroménager" --max-tokens 55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
