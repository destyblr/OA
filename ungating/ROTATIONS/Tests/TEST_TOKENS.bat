@echo off
title TEST - Mesure co??t tokens
color 0E

echo ========================================
echo   TEST : Mesure cout en tokens
echo ========================================
echo.
echo AVANT DE LANCER :
echo 1. Notez le nombre de tokens sur keepa.com/#!api
echo 2. Lancez ce test
echo 3. Notez le nombre de tokens APRES
echo 4. Calculez : tokens_consommes = avant - apres
echo.
echo ========================================
echo.

cd /d "%~dp0\..\backend"
node run-scan.js test-tokens

echo.
echo ========================================
echo   FIN DU TEST
echo ========================================
echo.
echo Retournez sur keepa.com/#!api pour voir
echo combien de tokens il reste.
echo.
pause
