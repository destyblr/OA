@echo off
chcp 65001 >nul
title Scan Keepa - Tefal

cd /d "%~dp0..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: Tefal
echo ========================================
echo.
echo Categorie: Electromenager
echo Mode: Scan complet (max 200 ASIN)
echo Sauvegarde progressive - Ctrl+C pour arreter
echo.
echo ========================================
echo.

node analyze-brand.js "Tefal" --category="Electromenager"

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
