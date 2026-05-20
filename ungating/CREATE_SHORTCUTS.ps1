# Script pour créer les raccourcis sur le bureau
$desktopPath = [Environment]::GetFolderPath("Desktop")
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Raccourci 1 : Démarrer le serveur
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut1 = $WshShell.CreateShortcut("$desktopPath\OA - ASIN Rentables Server.lnk")
$Shortcut1.TargetPath = "$scriptDir\START_SERVER.bat"
$Shortcut1.WorkingDirectory = $scriptDir
$Shortcut1.IconLocation = "C:\Windows\System32\shell32.dll,137"
$Shortcut1.Description = "Démarrer le serveur OA ASIN Rentables"
$Shortcut1.Save()

# Raccourci 2 : Ouvrir le dashboard
$Shortcut2 = $WshShell.CreateShortcut("$desktopPath\OA - Dashboard ASIN.lnk")
$Shortcut2.TargetPath = "$scriptDir\OPEN_DASHBOARD.bat"
$Shortcut2.WorkingDirectory = $scriptDir
$Shortcut2.IconLocation = "C:\Windows\System32\shell32.dll,14"
$Shortcut2.Description = "Ouvrir le dashboard ASIN Rentables"
$Shortcut2.Save()

# Raccourci 3 : Lancement complet (serveur + dashboard)
$Shortcut3 = $WshShell.CreateShortcut("$desktopPath\OA - ASIN Rentables (TOUT).lnk")
$Shortcut3.TargetPath = "$scriptDir\LAUNCH_ALL.bat"
$Shortcut3.WorkingDirectory = $scriptDir
$Shortcut3.IconLocation = "C:\Windows\System32\shell32.dll,16"
$Shortcut3.Description = "Démarrer serveur + ouvrir dashboard automatiquement"
$Shortcut3.Save()

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  RACCOURCIS CREES !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "3 raccourcis ont ete crees sur le bureau :" -ForegroundColor Cyan
Write-Host "  - OA - ASIN Rentables Server" -ForegroundColor Yellow
Write-Host "  - OA - Dashboard ASIN" -ForegroundColor Yellow
Write-Host "  - OA - ASIN Rentables (TOUT)" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur Entree pour fermer..." -ForegroundColor Gray
Read-Host
