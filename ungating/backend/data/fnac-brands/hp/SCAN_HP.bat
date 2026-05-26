@echo off
chcp 65001 >nul
title Scan Keepa - HP

cd /d "%~dp0..\..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: HP
echo ========================================
echo.
echo Categorie: Informatique
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "HP" --category="Informatique" --max-tokens=55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
