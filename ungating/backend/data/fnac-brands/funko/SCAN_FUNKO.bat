@echo off
chcp 65001 >nul
title Scan Keepa - Funko

cd /d "%~dp0..\..\..\"

echo.
echo ========================================
echo   SCAN KEEPA: Funko
echo ========================================
echo.
echo Categorie: Jouets
echo Mode: Scan complet (max 200 ASIN)
echo Sauvegarde progressive - Ctrl+C pour arreter
echo.
echo ========================================
echo.

node analyze-brand.js "Funko" --category="Jouets"

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
