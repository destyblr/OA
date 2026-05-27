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
echo Mode: Scan complet (max 200 ASIN)
echo Sauvegarde progressive - Ctrl+C pour arreter
echo.
echo ========================================
echo.

node analyze-brand.js "SEB" --category="Electromenager"

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
