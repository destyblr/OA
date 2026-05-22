# Créer les raccourcis simplement
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$scanner = "$desktop\OA Scanner"
$scripts = "C:\Users\desty\Desktop\Travail\OA\ungating\backend\scripts\brands"

# Créer les sous-dossiers
$categories = @('Jouets', 'Hygiene', 'Beaute', 'Bureau', 'Informatique', 'Sante')
foreach ($cat in $categories) {
    $folder = "$scanner\$cat"
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
}

# Parcourir tous les .bat et créer les raccourcis
Get-ChildItem -Path $scripts -Filter "*.bat" | ForEach-Object {
    $batFile = $_.FullName
    $brandName = $_.BaseName -replace 'scan-', ''

    # Déterminer la catégorie (basée sur le contenu ou le nom)
    $category = 'Jouets' # Par défaut

    # Créer le raccourci
    $shortcut = $shell.CreateShortcut("$scanner\$category\Scan $brandName.lnk")
    $shortcut.TargetPath = $batFile
    $shortcut.WorkingDirectory = $scripts
    $shortcut.Save()

    Write-Host "✅ $brandName" -ForegroundColor Green
}

Write-Host "`n✅ Terminé!" -ForegroundColor Cyan
