# Script pour creer une tache planifiee Windows qui lance le scanner auto au demarrage
# Executer en tant qu'administrateur

$TaskName = "OA-AutoScanner"
$ScriptPath = Join-Path $PSScriptRoot "..\LANCER_AUTO_SCANNER.bat"
$WorkingDir = Split-Path $ScriptPath -Parent

# Verifier si la tache existe deja
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($ExistingTask) {
    Write-Host "La tache '$TaskName' existe deja. Suppression..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Creer l'action (lancer le .bat)
$Action = New-ScheduledTaskAction -Execute $ScriptPath -WorkingDirectory $WorkingDir

# Creer le declencheur (au demarrage de Windows + 1 minute de delai)
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Trigger.Delay = "PT1M"

# Parametres de la tache
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

# Principal (utilisateur actuel)
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U

# Creer la tache
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Scanner automatique OA - Lance les scans Keepa en rotation sur toutes les categories"

Write-Host ""
Write-Host "Tache planifiee '$TaskName' creee avec succes!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  - Demarrage: Au demarrage de Windows (+1 min)"
Write-Host "  - Script: $ScriptPath"
Write-Host "  - Utilisateur: $env:USERNAME"
Write-Host "  - Redemarrage auto si plantage (3 tentatives)"
Write-Host ""
Write-Host "Gestion de la tache:" -ForegroundColor Cyan
Write-Host "  - Voir: Planificateur de taches > Bibliotheque"
Write-Host "  - Demarrer: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  - Arreter: Stop-ScheduledTask -TaskName '$TaskName'"
Write-Host "  - Desactiver: Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "  - Supprimer: Unregister-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
