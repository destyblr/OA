# Script de création des raccourcis (version simplifiée)
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$scannerRoot = Join-Path $desktop "OA Scanner"
$scriptsFolder = "C:\Users\desty\Desktop\Travail\OA\ungating\backend\scripts\brands"

Write-Host "Creation des raccourcis..."

# Marques par categorie
$marques = @{
    "Jouets" = "LEGO,Disney,Mattel,Hasbro,Playmobil,VTech,Ravensburger,Funko,Star Wars,Bandai,Lexibook,Asmodee,Smoby,Sylvanian Families,Spin Master,Clementoni,Janod,Brio,Melissa - Doug,Goliath,Hape,Chicco,Babybjorn,Sophie la Girafe,Beaba,Dodie,MAM,Tommee Tippee,Philips Avent"
    "Hygiene" = "Oral-B,Braun,Philips,Waterpik,Colgate,Sensodyne,Elmex"
    "Beaute" = "L-Oreal,Garnier,Maybelline,Nivea,Dove,Schwarzkopf"
    "Bureau" = "BIC,Stabilo,Pilot,Maped,Faber-Castell,Oxford,Clairefontaine,Leitz,Exacompta"
    "Informatique" = "Logitech,Microsoft,HP"
    "Sante" = "Omron,Beurer,Medisana"
}

$total = 0

foreach ($cat in $marques.Keys) {
    $catFolder = Join-Path $scannerRoot $cat
    New-Item -ItemType Directory -Path $catFolder -Force | Out-Null

    Write-Host "`n$cat :"

    $brands = $marques[$cat] -split ','

    foreach ($brandSafe in $brands) {
        $batPath = Join-Path $scriptsFolder "scan-$brandSafe.bat"

        if (Test-Path $batPath) {
            # Lire le vrai nom depuis le .bat
            $content = Get-Content $batPath -Raw
            if ($content -match 'title OA Scanner - (.+)') {
                $brandName = $Matches[1]
            } else {
                $brandName = $brandSafe -replace '-', ' '
            }

            # Creer raccourci
            $lnkPath = Join-Path $catFolder "Scan $brandName.lnk"
            $shortcut = $shell.CreateShortcut($lnkPath)
            $shortcut.TargetPath = $batPath
            $shortcut.WorkingDirectory = $scriptsFolder
            $shortcut.Save()

            Write-Host "  OK $brandName"
            $total++
        }
    }
}

Write-Host "`n$total raccourcis crees dans $scannerRoot"
