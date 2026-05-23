@echo off
chcp 65001 >nul
title Scan Keepa - Lego

cd /d "%~dp0..\..\..\backend"

echo.
echo ========================================
echo   SCAN KEEPA: Lego
echo ========================================
echo.
echo Categorie: Jouets
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "Lego" --category "Jouets" --max-tokens 55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
