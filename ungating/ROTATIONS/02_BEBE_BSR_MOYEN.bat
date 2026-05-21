@echo off
title OA - Scan Bebe BSR Moyen (10K-30K)
color 0B
echo ======================================== && echo   SCAN : Bebe - BSR Moyen (10K-30K) && echo ======================================== && echo.
echo [1/3] Verification du serveur...
curl -s http://localhost:3000/health >/dev/null 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ^> Serveur non detecte
    echo [2/3] Demarrage du serveur...
    start "OA Server" cmd /k "cd /d %~dp0\..\backend && npm start"
    echo   ^> Attente 8 secondes...
    timeout /t 8 /nobreak >/dev/null
) else (
    echo   ^> Serveur deja actif
)
echo [3/3] Lancement du scan... && echo.
curl -X POST http://localhost:3000/api/brands/scan -H "Content-Type: application/json" -d "{\"rotationId\": \"bebe-bsr-moyen\"}"
echo. && echo SCAN LANCE - Dashboard: http://localhost:3000/pages/ungating.html
timeout /t 10 /nobreak
