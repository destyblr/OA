#!/usr/bin/env node
/**
 * Génère les dossiers et scripts depuis MARQUES.txt
 */

const fs = require('fs');
const path = require('path');

const BRANDS_FILE = path.join(__dirname, 'data/fnac-brands/MARQUES.txt');
const BRANDS_DIR = path.join(__dirname, 'data/fnac-brands');

function parseBrandsFile() {
  const content = fs.readFileSync(BRANDS_FILE, 'utf8');
  const lines = content.split('\n');

  const brands = [];

  for (const line of lines) {
    // Ignorer commentaires et lignes vides
    if (line.trim().startsWith('//') || !line.trim()) continue;

    // Parser: Nom | Catégorie
    const parts = line.split('|').map(p => p.trim());
    if (parts.length === 2) {
      brands.push({
        name: parts[0],
        category: parts[1]
      });
    }
  }

  return brands;
}

function createBrandFolder(brand) {
  const brandSlug = brand.name.toLowerCase().replace(/\s+/g, '-');
  const brandDir = path.join(BRANDS_DIR, brandSlug);

  // Créer le dossier
  if (!fs.existsSync(brandDir)) {
    fs.mkdirSync(brandDir, { recursive: true });
    console.log(`   📁 Créé: ${brandSlug}/`);
  } else {
    console.log(`   ✓ Existe: ${brandSlug}/`);
  }

  // Créer le fichier .bat
  const batContent = `@echo off
chcp 65001 >nul
title Scan Keepa - ${brand.name}

cd /d "%~dp0..\\..\\..\\backend"

echo.
echo ========================================
echo   SCAN KEEPA: ${brand.name}
echo ========================================
echo.
echo Categorie: ${brand.category}
echo Limite: 55 tokens max
echo.
echo ========================================
echo.

node analyze-brand.js "${brand.name}" --category="${brand.category}" --max-tokens=55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
`;

  const batPath = path.join(brandDir, `SCAN_${brand.name.toUpperCase().replace(/\s+/g, '_')}.bat`);
  fs.writeFileSync(batPath, batContent, 'ascii');

  // Créer README.md
  const readmeContent = `# ${brand.name} - Analyse Keepa

## 🎯 Informations

- **Marque:** ${brand.name}
- **Catégorie:** ${brand.category}
- **Source:** FNAC Pro

## 🚀 Lancer le scan

Double-cliquez sur:
\`\`\`
SCAN_${brand.name.toUpperCase().replace(/\s+/g, '_')}.bat
\`\`\`

## 📊 Résultats

Les résultats seront sauvegardés dans:
- Supabase: table \`profitable_asins\`
- Dashboard: onglet "🏆 ASIN Rentables"

## 💰 Coût

- **Max tokens:** 55
- **Produits analysés:** ~44 max
- **Durée:** ~10 secondes
`;

  fs.writeFileSync(path.join(brandDir, 'README.md'), readmeContent, 'utf8');
}

function createBrandsIndex(brands) {
  const indexPath = path.join(BRANDS_DIR, 'brands-list.json');

  const brandsData = {
    generated: new Date().toISOString(),
    totalBrands: brands.length,
    brands: brands.map(b => ({
      name: b.name,
      slug: b.name.toLowerCase().replace(/\s+/g, '-'),
      category: b.category,
      scanned: false,
      lastScan: null
    }))
  };

  fs.writeFileSync(indexPath, JSON.stringify(brandsData, null, 2), 'utf8');
  console.log(`\n📄 Index mis à jour: brands-list.json (${brands.length} marques)`);
}

async function main() {
  console.log('\n🏭 GÉNÉRATION DES DOSSIERS MARQUES\n');
  console.log('='.repeat(60));

  try {
    // Parser le fichier MARQUES.txt
    const brands = parseBrandsFile();

    if (brands.length === 0) {
      console.log('❌ Aucune marque trouvée dans MARQUES.txt');
      console.log('   Ajoute tes marques au format: Nom | Catégorie');
      return;
    }

    console.log(`📋 ${brands.length} marques détectées:\n`);
    brands.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.name.padEnd(25)} (${b.category})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('📁 Création des dossiers...\n');

    // Créer un dossier par marque
    brands.forEach(brand => {
      createBrandFolder(brand);
    });

    // Créer l'index
    createBrandsIndex(brands);

    console.log('\n' + '='.repeat(60));
    console.log('✅ GÉNÉRATION TERMINÉE!');
    console.log('='.repeat(60));
    console.log(`📁 Dossier: ${BRANDS_DIR}`);
    console.log(`📦 Marques configurées: ${brands.length}`);
    console.log('\n🚀 Pour scanner une marque:');
    console.log(`   1. Ouvre: ${BRANDS_DIR}`);
    console.log('   2. Entre dans le dossier de la marque');
    console.log('   3. Double-clique sur SCAN_XXX.bat');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

main();
