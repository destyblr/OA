@echo off
chcp 65001 >nul
title Scan Keepa - Lego

cd /d "%~dp0..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: Lego
echo ========================================
echo.
echo Categorie: Jouets
echo Mode: Scan complet (max 200 ASIN)
echo Sauvegarde progressive - Ctrl+C pour arreter
echo.
echo ========================================
echo.

node analyze-brand.js "Lego" --category="Jouets"

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
