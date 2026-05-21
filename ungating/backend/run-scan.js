#!/usr/bin/env node
/**
 * Script pour lancer un scan directement depuis la ligne de commande
 * Usage: node run-scan.js <rotation-id>
 */

require('dotenv').config();
const brandFinder = require('./services/brand-finder');
const fs = require('fs');
const path = require('path');

// Récupérer l'ID de rotation depuis les arguments
const rotationId = process.argv[2];

if (!rotationId) {
  console.error('❌ Erreur: ID de rotation manquant');
  console.log('Usage: node run-scan.js <rotation-id>');
  process.exit(1);
}

// Charger la configuration de rotation
const rotationsPath = path.join(__dirname, 'config/rotations.json');
const rotations = JSON.parse(fs.readFileSync(rotationsPath, 'utf8'));
const rotation = rotations.find(r => r.id === rotationId);

if (!rotation) {
  console.error(`❌ Rotation "${rotationId}" introuvable`);
  process.exit(1);
}

// Lancer le scan
console.log('');
console.log('========================================');
console.log(`  ${rotation.name}`);
console.log('========================================');
console.log('');

brandFinder.runScanWithConfig(rotation)
  .then(result => {
    console.log('');
    console.log('========================================');
    console.log('  ✅ SCAN TERMINE AVEC SUCCES');
    console.log('========================================');
    console.log('');
    console.log(`📊 Résultats:`);
    console.log(`   - ASIN trouvés: ${result.summary.asinsFound}`);
    console.log(`   - Marques: ${result.summary.brandsFound}`);
    console.log(`   - Avec FNAC: ${result.summary.brandsWithFnac}`);
    console.log(`   - Tokens: ${result.summary.tokensUsed}`);
    console.log(`   - Durée: ${result.summary.duration}s`);
    console.log('');
    console.log('Dashboard: http://localhost:3000/pages/ungating.html');
    console.log('');
    process.exit(0);
  })
  .catch(error => {
    console.error('');
    console.error('========================================');
    console.error('  ❌ ERREUR SCAN');
    console.error('========================================');
    console.error('');
    console.error(error.message);
    console.error('');
    process.exit(1);
  });
