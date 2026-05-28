#!/usr/bin/env node
/**
 * Test v2: Trouver le bon paramètre pour filtrer par marque
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const keepaAPI = require('./services/keepa-api');

async function testBrandFilter() {
  console.log('🔍 TEST FILTRE MARQUE KEEPA API\n');
  console.log('='.repeat(60));

  // Attendre que les tokens se rechargent
  const tokens = await keepaAPI.getTokens();
  console.log(`💰 Tokens disponibles: ${tokens}\n`);

  if (tokens < 20) {
    console.log('⏳ Pas assez de tokens. Besoin d\'au moins 20.');
    console.log(`   Recharge: ${20 - tokens} tokens / ${20 - tokens} minutes\n`);
    return;
  }

  console.log('📋 Configuration test:');
  console.log('   Marque: BaByliss');
  console.log('   BSR: 1 - 10000');
  console.log('   Prix: 15 - 50€');
  console.log('   Max vendeurs FBA: 5\n');

  try {
    // Test avec keepa-api.js qui utilise productFinder
    const result = await keepaAPI.productFinder({
      category: 'Hygiène et Santé', // Catégorie Beauté
      bsrRange: [1, 10000],
      priceRange: [1500, 5000], // En centimes
      maxSellers: 5,
      excludeAmazon: true,
      page: 1,
      perPage: 10,
      // NOUVEAU: Ajouter le filtre marque
      brand: 'BaByliss'
    });

    console.log('✅ Résultat:');
    console.log(`   ASIN trouvés: ${result.products.length}`);
    console.log(`   Tokens utilisés: ${result.tokensUsed}\n`);

    if (result.products.length > 0) {
      console.log('📦 Premiers produits:');
      result.products.slice(0, 5).forEach(p => {
        console.log(`   - ${p.asin} | ${p.brand} | ${p.title?.substring(0, 50)}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);

    // Si erreur, essayer en accédant directement à l'URL Keepa
    console.log('\n💡 Test alternatif: Inspection manuelle');
    console.log('   1. Va sur keepa.com/product/finder');
    console.log('   2. Remplis:');
    console.log('      - Marque: babyliss');
    console.log('      - BSR: 1-10000');
    console.log('      - Prix: 15-50€');
    console.log('   3. Lance la recherche');
    console.log('   4. Copie l\'URL complète');
    console.log('   5. L\'URL contiendra le paramètre exact pour "Marque"\n');
  }
}

testBrandFilter();
