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
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "Funko" --category="Jouets" --max-tokens=55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
