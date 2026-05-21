@echo off
title OA - Beaute - BSR Bas (1-10K)
color 0B
echo ======================================== && echo   SCAN : Beaute - BSR Bas (1-10K) && echo ======================================== && echo.
echo [1/3] Verification du serveur...
curl -s http://localhost:3000/health >/dev/null 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ^> Serveur non detecte
    echo [2/3] Demarrage du serveur...
    cd /d "%~dp0\..\backend"
    start "OA Server" cmd /k "npm start"
    echo   ^> Attente 10 secondes pour le demarrage...
    timeout /t 10 /nobreak
    cd /d "%~dp0"
) else (
    echo   ^> Serveur deja actif
)
echo [3/3] Lancement du scan... && echo.
curl -X POST http://localhost:3000/api/brands/scan -H "Content-Type: application/json" -d "{\"rotationId\": \"beaute-bsr-bas\"}"
echo. && echo.
echo ======================================== && echo   SCAN TERMINE && echo ======================================== && echo.
echo Consulte les logs du serveur dans la fenetre "OA Server"
echo Dashboard: http://localhost:3000/pages/ungating.html
echo. && echo Appuyez sur une touche pour fermer...
pause >/dev/null
