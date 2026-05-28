@echo off
chcp 65001 >nul
title Scan Keepa - HP

cd /d "%~dp0..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: HP
echo ========================================
echo.
echo Categorie: Informatique
echo Mode: Scan complet (max 200 ASIN)
echo Sauvegarde progressive - Ctrl+C pour arreter
echo.
echo ========================================
echo.

node analyze-brand.js "HP" --category="Informatique"

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
