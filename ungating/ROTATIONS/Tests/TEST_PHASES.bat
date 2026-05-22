@echo off
title Test Phases 2-8 (SANS tokens)
color 0E

echo ========================================
echo   TEST PHASES 2-8 (SANS TOKENS KEEPA)
echo ========================================
echo.
echo Ce test simule des produits Keepa
echo et teste toutes les phases:
echo.
echo Phase 2: Filtre Hazmat
echo Phase 3: SP-API Check
echo Phase 4: Sauvegarde ASIN
echo Phase 5: Groupement marques
echo Phase 6: Check FNAC
echo Phase 7: Calcul scores
echo Phase 8: Sauvegarde marques
echo.
echo ========================================
echo.

cd /d "%~dp0\..\backend"
node test-phases.js

echo.
pause