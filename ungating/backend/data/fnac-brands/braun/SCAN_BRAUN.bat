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
echo Mode: Scan complet (max 200 ASIN)
echo Sauvegarde progressive - Ctrl+C pour arreter
echo.
echo ========================================
echo.

node analyze-brand.js "Braun" --category="Beaute"

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
