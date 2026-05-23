#!/usr/bin/env node
/**
 * Détecte les marques disponibles sur FNAC Pro
 * Crée un dossier + script .bat pour chaque marque
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FNAC_BRANDS_DIR = path.join(__dirname, 'data/fnac-brands');

/**
 * Récupérer les marques FNAC Pro
 *
 * OPTIONS:
 * A) Scraper fnac.com/pro
 * B) Lire depuis ton dashboard Supabase
 * C) Fichier manuel brands.txt
 */
async function detectFnacBrands() {
  console.log('🔍 DÉTECTION MARQUES FNAC PRO\n');
  console.log('='.repeat(60));

  // TODO: À compléter selon ta source de données

  // OPTION A: Scraping FNAC Pro (nécessite URL exacte)
  console.log('\n💡 Comment récupères-tu les marques FNAC actuellement?');
  console.log('   1. Depuis ton dashboard (Supabase)?');
  console.log('   2. Liste manuelle (fichier texte)?');
  console.log('   3. Scraping site FNAC Pro?');
  console.log('   4. Export CSV depuis FNAC?\n');

  // TEMPORAIRE: Liste de test
  const testBrands = [
    { name: 'BaByliss', category: 'Beauté' },
    { name: 'Philips', category: 'Électroménager' },
    { name: 'Rowenta', category: 'Électroménager' },
    { name: 'Dyson', category: 'Électroménager' },
    { name: 'Lego', category: 'Jouets' }
  ];

  console.log('📋 MARQUES FNAC DÉTECTÉES (Test):');
  console.log('='.repeat(60));
  testBrands.forEach((b, i) => {
    console.log(`   ${i + 1}. ${b.name.padEnd(20)} (${b.category})`);
  });
  console.log('='.repeat(60));
  console.log(`\n✅ Total: ${testBrands.length} marques\n`);

  return testBrands;
}

/**
 * Créer la structure de dossiers pour une marque
 */
function createBrandFolder(brand) {
  const brandSlug = brand.name.toLowerCase().replace(/\s+/g, '-');
  const brandDir = path.join(FNAC_BRANDS_DIR, brandSlug);

  // Créer le dossier
  if (!fs.existsSync(brandDir)) {
    fs.mkdirSync(brandDir, { recursive: true });
    console.log(`   📁 Créé: ${brandSlug}/`);
  }

  // Créer le fichier .bat de lancement
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

node analyze-brand.js "${brand.name}" --category "${brand.category}" --max-tokens 55

echo.
echo ========================================
echo   SCAN TERMINE
echo ========================================
echo.

pause
`;

  const batPath = path.join(brandDir, `SCAN_${brand.name.toUpperCase().replace(/\s+/g, '_')}.bat`);
  fs.writeFileSync(batPath, batContent, 'ascii');
  console.log(`   ✅ Script: SCAN_${brand.name.toUpperCase().replace(/\s+/g, '_')}.bat`);

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

  return brandDir;
}

/**
 * Créer le fichier index des marques
 */
function createBrandsIndex(brands) {
  const indexPath = path.join(FNAC_BRANDS_DIR, 'brands-list.json');

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
  console.log(`\n📄 Index créé: brands-list.json`);

  return indexPath;
}

/**
 * Main
 */
async function main() {
  try {
    // 1. Détecter les marques
    const brands = await detectFnacBrands();

    // 2. Créer le dossier principal
    if (!fs.existsSync(FNAC_BRANDS_DIR)) {
      fs.mkdirSync(FNAC_BRANDS_DIR, { recursive: true });
    }

    // 3. Créer un dossier par marque
    console.log('\n📁 CRÉATION DOSSIERS ET SCRIPTS:');
    console.log('='.repeat(60));

    brands.forEach(brand => {
      createBrandFolder(brand);
    });

    // 4. Créer l'index
    createBrandsIndex(brands);

    // 5. Résumé
    console.log('\n' + '='.repeat(60));
    console.log('✅ CONFIGURATION TERMINÉE!');
    console.log('='.repeat(60));
    console.log(`📁 Dossier: ${FNAC_BRANDS_DIR}`);
    console.log(`📦 Marques configurées: ${brands.length}`);
    console.log('\n🚀 Pour lancer un scan:');
    console.log(`   1. Ouvre: ${FNAC_BRANDS_DIR}`);
    console.log('   2. Entre dans le dossier de la marque');
    console.log('   3. Double-clique sur SCAN_XXX.bat');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

main();
