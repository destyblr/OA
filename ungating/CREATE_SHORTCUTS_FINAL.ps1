# Script final pour créer les raccourcis par catégorie
$ErrorActionPreference = "Stop"

$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$scannerRoot = Join-Path $desktop "OA Scanner"
$scriptsFolder = "C:\Users\desty\Desktop\Travail\OA\ungating\backend\scripts\brands"

Write-Host "`n🚀 Création des raccourcis..." -ForegroundColor Cyan

# Définir les marques par catégorie
$categories = @{
    "Jouets" = @(
        "LEGO", "Disney", "Mattel", "Hasbro", "Playmobil", "VTech",
        "Ravensburger", "Funko", "Star-Wars", "Bandai", "Lexibook",
        "Asmodee", "Smoby", "Sylvanian-Families", "Spin-Master",
        "Clementoni", "Janod", "Brio", "Melissa---Doug", "Goliath",
        "Hape", "Chicco", "Babybjorn", "Sophie-la-Girafe", "Beaba",
        "Dodie", "MAM", "Tommee-Tippee", "Philips-Avent"
    )
    "Hygiene" = @(
        "Oral-B", "Braun", "Philips", "Waterpik", "Colgate", "Sensodyne", "Elmex"
    )
    "Beaute" = @(
        "L-Oreal", "Garnier", "Maybelline", "Nivea", "Dove", "Schwarzkopf"
    )
    "Bureau" = @(
        "BIC", "Stabilo", "Pilot", "Maped", "Faber-Castell",
        "Oxford", "Clairefontaine", "Leitz", "Exacompta"
    )
    "Informatique" = @(
        "Logitech", "Microsoft", "HP"
    )
    "Sante" = @(
        "Omron", "Beurer", "Medisana"
    )
}

$total = 0

foreach ($category in $categories.Keys) {
    $categoryFolder = Join-Path $scannerRoot $category

    # Créer le dossier de catégorie
    if (-not (Test-Path $categoryFolder)) {
        New-Item -ItemType Directory -Path $categoryFolder -Force | Out-Null
    }

    Write-Host "`n📦 $category" -ForegroundColor Yellow

    foreach ($brandSafe in $categories[$category]) {
        $batName = "scan-$brandSafe.bat"
        $batPath = Join-Path $scriptsFolder $batName

        if (Test-Path $batPath) {
            # Récupérer le vrai nom de la marque depuis le .bat
            $batContent = Get-Content $batPath -Raw
            if ($batContent -match 'title OA Scanner - (.+)') {
                $brandName = $Matches[1]
            } else {
                $brandName = $brandSafe -replace '-', ' '
            }

            # Créer le raccourci
            $shortcutPath = Join-Path $categoryFolder "Scan $brandName.lnk"
            $shortcut = $shell.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = $batPath
            $shortcut.WorkingDirectory = $scriptsFolder
            $shortcut.Description = "Scan $brandName (prix max 10 EUR)"
            $shortcut.Save()

            Write-Host "   ✅ $brandName" -ForegroundColor Green
            $total++
        } else {
            Write-Host "   ⚠️  $brandSafe (fichier .bat introuvable)" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ Terminé! $total raccourcis créés dans:" -ForegroundColor Green
Write-Host "   $scannerRoot`n" -ForegroundColor Cyan

# Afficher le résumé
Write-Host "📊 Résumé:" -ForegroundColor Cyan
foreach ($category in $categories.Keys) {
    $count = $categories[$category].Count
    Write-Host "   $category : $count scans" -ForegroundColor White
}
