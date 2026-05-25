@echo off
chcp 65001 >nul
title TEST MODE - Scan Babyliss sans tokens

cd /d "%~dp0..\..\"

echo.
echo ========================================
echo   TEST MODE - SCAN BABYLISS
echo ========================================
echo.
echo Mode: SIMULATION - 0 tokens
echo Marque: BaByliss
echo Produits: 10 produits realistes
echo.
echo ========================================
echo.

node test-analyze-brand.js

echo.
echo ========================================
echo   TEST TERMINE
echo ========================================
echo.
echo Ouvre le dashboard pour voir les resultats
echo https://oa-fba.netlify.app
echo.
echo Onglet: ASIN Rentables
echo.

pause