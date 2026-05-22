// Créer les raccourcis de scan par marque
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktop = path.join(require('os').homedir(), 'Desktop');
const scannerFolder = path.join(desktop, 'OA Scanner');
const scriptsFolder = path.join(__dirname, 'scripts', 'brands');
const projectRoot = path.join(__dirname, '..');

// Marques par catégorie
const brands = {
  'Jouets': [
    'LEGO', 'Disney', 'Mattel', 'Hasbro', 'Playmobil', 'VTech',
    'Ravensburger', 'Funko', 'Star Wars', 'Bandai', 'Lexibook',
    'Asmodee', 'Smoby', 'Sylvanian Families', 'Spin Master',
    'Clementoni', 'Janod', 'Brio', 'Melissa & Doug', 'Goliath',
    'Hape', 'Chicco', 'Babybjorn', 'Sophie la Girafe', 'Beaba',
    'Dodie', 'MAM', 'Tommee Tippee', 'Philips Avent'
  ],
  'Hygiene': [
    'Oral-B', 'Braun', 'Philips', 'Waterpik', 'Colgate', 'Sensodyne', 'Elmex'
  ],
  'Beaute': [
    "L'Oreal", 'Garnier', 'Maybelline', 'Nivea', 'Dove', 'Schwarzkopf'
  ],
  'Bureau': [
    'BIC', 'Stabilo', 'Pilot', 'Maped', 'Faber-Castell',
    'Oxford', 'Clairefontaine', 'Leitz', 'Exacompta'
  ],
  'Informatique': [
    'Logitech', 'Microsoft', 'HP'
  ],
  'Sante': [
    'Omron', 'Beurer', 'Medisana'
  ]
};

console.log('\n🧹 Nettoyage...\n');

// Supprimer ancien dossier
if (fs.existsSync(scannerFolder)) {
  fs.rmSync(scannerFolder, { recursive: true, force: true });
}

// Créer dossiers
fs.mkdirSync(scannerFolder, { recursive: true });
fs.mkdirSync(scriptsFolder, { recursive: true });

let totalBrands = 0;

Object.keys(brands).forEach(category => {
  console.log(`\n📦 ${category}...`);

  const categoryFolder = path.join(scannerFolder, category);
  fs.mkdirSync(categoryFolder, { recursive: true });

  brands[category].forEach(brand => {
    // Nom de fichier safe
    const safeName = brand.replace(/[&\\/:*?"<>|']/g, '-');
    const scriptName = `scan-${safeName}.bat`;
    const scriptPath = path.join(scriptsFolder, scriptName);

    // Créer script .bat
    const batContent = `@echo off
title OA Scanner - ${brand}
cd /d "%~dp0..\\.."
start /B node server.js
timeout /t 4 /nobreak >nul
curl -X POST http://localhost:3000/api/ungating/scan/brand -H "Content-Type: application/json" -d "{\\"brand\\":\\"${brand}\\",\\"maxPrice\\":10}"
echo [OK] Scan ${brand} lance !
pause
`;

    fs.writeFileSync(scriptPath, batContent);

    // Créer raccourci .lnk via PowerShell
    const shortcutPath = path.join(categoryFolder, `Scan ${brand}.lnk`);
    const psCommand = `
      $shell = New-Object -ComObject WScript.Shell;
      $shortcut = $shell.CreateShortcut('${shortcutPath.replace(/\\/g, '\\\\')}');
      $shortcut.TargetPath = '${scriptPath.replace(/\\/g, '\\\\')}';
      $shortcut.WorkingDirectory = '${scriptsFolder.replace(/\\/g, '\\\\')}';
      $shortcut.Description = 'Scan ${brand} (≤10€)';
      $shortcut.Save()
    `;

    execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' });

    console.log(`   ✅ ${brand}`);
    totalBrands++;
  });
});

console.log(`\n✅ Terminé! ${totalBrands} marques créées dans ${scannerFolder}\n`);
