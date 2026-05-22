# Script pour créer les raccourcis de scan par marque
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$scannerFolder = "$desktop\OA Scanner"
$scriptsFolder = "$PSScriptRoot\scripts\brands"

Write-Host "`n🧹 Nettoyage..." -ForegroundColor Yellow

# Supprimer anciens raccourcis
if (Test-Path $scannerFolder) {
    Remove-Item -Path $scannerFolder -Recurse -Force
}

# Créer dossiers
New-Item -ItemType Directory -Path $scannerFolder -Force | Out-Null
New-Item -ItemType Directory -Path $scriptsFolder -Force | Out-Null

# Définir les catégories et marques
$brands = @(
    @{Cat="Jouets"; Icon="🧸"; Name="LEGO"},
    @{Cat="Jouets"; Icon="🧸"; Name="Disney"},
    @{Cat="Jouets"; Icon="🧸"; Name="Mattel"},
    @{Cat="Jouets"; Icon="🧸"; Name="Hasbro"},
    @{Cat="Jouets"; Icon="🧸"; Name="Playmobil"},
    @{Cat="Jouets"; Icon="🧸"; Name="VTech"},
    @{Cat="Jouets"; Icon="🧸"; Name="Ravensburger"},
    @{Cat="Jouets"; Icon="🧸"; Name="Funko"},
    @{Cat="Jouets"; Icon="🧸"; Name="Star Wars"},
    @{Cat="Jouets"; Icon="🧸"; Name="Bandai"},
    @{Cat="Jouets"; Icon="🧸"; Name="Lexibook"},
    @{Cat="Jouets"; Icon="🧸"; Name="Asmodee"},
    @{Cat="Jouets"; Icon="🧸"; Name="Smoby"},
    @{Cat="Jouets"; Icon="🧸"; Name="Sylvanian Families"},
    @{Cat="Jouets"; Icon="🧸"; Name="Spin Master"},
    @{Cat="Jouets"; Icon="🧸"; Name="Clementoni"},
    @{Cat="Jouets"; Icon="🧸"; Name="Janod"},
    @{Cat="Jouets"; Icon="🧸"; Name="Brio"},
    @{Cat="Jouets"; Icon="🧸"; Name="Melissa et Doug"},
    @{Cat="Jouets"; Icon="🧸"; Name="Goliath"},
    @{Cat="Jouets"; Icon="🧸"; Name="Hape"},
    @{Cat="Jouets"; Icon="🧸"; Name="Chicco"},
    @{Cat="Jouets"; Icon="🧸"; Name="Babybjorn"},
    @{Cat="Jouets"; Icon="🧸"; Name="Sophie la Girafe"},
    @{Cat="Jouets"; Icon="🧸"; Name="Beaba"},
    @{Cat="Jouets"; Icon="🧸"; Name="Dodie"},
    @{Cat="Jouets"; Icon="🧸"; Name="MAM"},
    @{Cat="Jouets"; Icon="🧸"; Name="Tommee Tippee"},
    @{Cat="Jouets"; Icon="🧸"; Name="Philips Avent"},

    @{Cat="Hygiene"; Icon="🪥"; Name="Oral-B"},
    @{Cat="Hygiene"; Icon="🪥"; Name="Braun"},
    @{Cat="Hygiene"; Icon="🪥"; Name="Philips"},
    @{Cat="Hygiene"; Icon="🪥"; Name="Waterpik"},
    @{Cat="Hygiene"; Icon="🪥"; Name="Colgate"},
    @{Cat="Hygiene"; Icon="🪥"; Name="Sensodyne"},
    @{Cat="Hygiene"; Icon="🪥"; Name="Elmex"},

    @{Cat="Beaute"; Icon="💄"; Name="L``'Oreal"},
    @{Cat="Beaute"; Icon="💄"; Name="Garnier"},
    @{Cat="Beaute"; Icon="💄"; Name="Maybelline"},
    @{Cat="Beaute"; Icon="💄"; Name="Nivea"},
    @{Cat="Beaute"; Icon="💄"; Name="Dove"},
    @{Cat="Beaute"; Icon="💄"; Name="Schwarzkopf"},

    @{Cat="Bureau"; Icon="📝"; Name="BIC"},
    @{Cat="Bureau"; Icon="📝"; Name="Stabilo"},
    @{Cat="Bureau"; Icon="📝"; Name="Pilot"},
    @{Cat="Bureau"; Icon="📝"; Name="Maped"},
    @{Cat="Bureau"; Icon="📝"; Name="Faber-Castell"},
    @{Cat="Bureau"; Icon="📝"; Name="Oxford"},
    @{Cat="Bureau"; Icon="📝"; Name="Clairefontaine"},
    @{Cat="Bureau"; Icon="📝"; Name="Leitz"},
    @{Cat="Bureau"; Icon="📝"; Name="Exacompta"},

    @{Cat="Informatique"; Icon="💻"; Name="Logitech"},
    @{Cat="Informatique"; Icon="💻"; Name="Microsoft"},
    @{Cat="Informatique"; Icon="💻"; Name="HP"},

    @{Cat="Sante"; Icon="🏥"; Name="Omron"},
    @{Cat="Sante"; Icon="🏥"; Name="Beurer"},
    @{Cat="Sante"; Icon="🏥"; Name="Medisana"}
)

$stats = @{}

foreach ($brand in $brands) {
    $cat = $brand.Cat
    $icon = $brand.Icon
    $name = $brand.Name

    # Créer sous-dossier catégorie si nécessaire
    $categoryFolder = "$scannerFolder\$cat"
    if (-not (Test-Path $categoryFolder)) {
        New-Item -ItemType Directory -Path $categoryFolder -Force | Out-Null
        Write-Host "`n$icon $cat" -ForegroundColor Cyan
        $stats[$cat] = 0
    }

    # Nom de fichier safe
    $safeName = $name -replace '[&\\/:*?"<>|'']', '-'
    $scriptPath = "$scriptsFolder\scan-$safeName.bat"

    # Créer script .bat
    $batContent = @"
@echo off
title OA Scanner - $name
cd /d "%~dp0..\.."
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/brand -H "Content-Type: application/json" -d "{`"brand`":`"$name`",`"maxPrice`":10}"
echo [OK] Scan $name lance !
pause
"@
    Set-Content -Path $scriptPath -Value $batContent -Encoding ASCII

    # Créer raccourci .lnk
    $shortcutPath = "$categoryFolder\Scan $name.lnk"
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $scriptPath
    $shortcut.WorkingDirectory = "$scriptsFolder"
    $shortcut.Description = "Scan $name (prix ≤10€)"
    $shortcut.Save()

    Write-Host "   ✅ $name" -ForegroundColor Green
    $stats[$cat]++
}

Write-Host "`n✅ Terminé! $($brands.Count) marques créées" -ForegroundColor Green
Write-Host "`n📁 Dossier: $scannerFolder" -ForegroundColor Cyan
