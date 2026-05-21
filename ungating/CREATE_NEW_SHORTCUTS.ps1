# Script pour créer les nouveaux raccourcis de scan
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$scannerFolder = "$desktop\OA Scanner"

# Créer le dossier s'il n'existe pas
if (-not (Test-Path $scannerFolder)) {
    New-Item -ItemType Directory -Path $scannerFolder | Out-Null
}

# Liste des nouveaux scans à créer
$scans = @(
    @{Name="Scan Bebe"; Script="scan-bebe.bat"; Icon="👶"},
    @{Name="Scan Hygiene"; Script="scan-hygiene.bat"; Icon="🪥"},
    @{Name="Scan Animalerie"; Script="scan-animalerie.bat"; Icon="🐾"},
    @{Name="Scan Alimentation"; Script="scan-alimentation.bat"; Icon="🍎"}
)

foreach ($scan in $scans) {
    $shortcutPath = "$scannerFolder\$($scan.Name).lnk"
    $targetPath = "$PSScriptRoot\scripts\$($scan.Script)"
    $workingDir = "$PSScriptRoot\scripts"

    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $workingDir
    $shortcut.Description = "Lance un scan $($scan.Name)"
    $shortcut.Save()

    Write-Host "✅ Créé: $($scan.Icon) $($scan.Name)" -ForegroundColor Green
}

Write-Host "`n✅ Tous les raccourcis ont été créés dans: $scannerFolder" -ForegroundColor Cyan
