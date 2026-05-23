#!/usr/bin/env node
/**
 * Test: Détecter Hazmat via Catalog API (attributs produit)
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const spAPI = require('./services/sp-api');

async function testHazmatDetection() {
  console.log('🔍 Test détection Hazmat via Catalog API\n');
  console.log('='.repeat(60));

  // ASIN test: ShinePick microphone (Hazmat selon ProfitPath)
  const ASIN_TEST = 'B093V4NPQ8';

  try {
    console.log(`\n📦 Récupération catalogue pour ${ASIN_TEST}...\n`);

    const catalog = await spAPI.getCatalogItem(ASIN_TEST);

    if (catalog) {
      console.log('✅ Catalogue récupéré:');
      console.log(JSON.stringify(catalog, null, 2));

      // Chercher indices Hazmat dans les données
      const catalogStr = JSON.stringify(catalog).toLowerCase();

      const hazmatKeywords = [
        'battery', 'batterie', 'lithium', 'pile',
        'dangerous', 'hazmat', 'hazardous',
        'flammable', 'inflammable'
      ];

      console.log('\n🔍 Recherche mots-clés Hazmat:');
      let hazmatDetected = false;

      for (const keyword of hazmatKeywords) {
        if (catalogStr.includes(keyword)) {
          console.log(`   ⚠️  "${keyword}" trouvé!`);
          hazmatDetected = true;
        }
      }

      if (!hazmatDetected) {
        console.log('   ✅ Aucun mot-clé Hazmat détecté');
      }

      console.log('\n' + '='.repeat(60));
      console.log(hazmatDetected ? '⚠️  HAZMAT DÉTECTÉ' : '✅ Pas Hazmat');
      console.log('='.repeat(60));

    } else {
      console.log('❌ Aucune donnée catalogue');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testHazmatDetection();
