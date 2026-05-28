@echo off
chcp 65001 >nul
title Scan Keepa - Bic

cd /d "%~dp0..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: Bic
echo ========================================
echo.
echo Categorie: Fournitures
echo Mode: Scan complet (max 200 ASIN)
echo Sauvegarde progressive - Ctrl+C pour arreter
echo.
echo ========================================
echo.

node analyze-brand.js "Bic" --category="Fournitures"

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
