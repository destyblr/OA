#!/usr/bin/env node
/**
 * Test de la clé Keepa API
 */

require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

console.log('🔑 Test de la clé Keepa...');
console.log(`Clé: ${KEEPA_API_KEY.substring(0, 20)}...`);
console.log('');

// Test 1: Vérifier les tokens
async function testTokens() {
  try {
    console.log('📊 Test 1: Vérification des tokens...');
    const response = await axios.get('https://api.keepa.com/token', {
      params: { key: KEEPA_API_KEY }
    });

    console.log('✅ Clé valide !');
    console.log(`   Tokens restants: ${response.data.tokensLeft}`);
    console.log(`   Recharge: ${response.data.refillRate} token/min`);
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Erreur tokens:', error.response?.data || error.message);
    return false;
  }
}

// Test 2: Product Finder SANS catégorie
async function testProductFinder() {
  try {
    console.log('🔍 Test 2: Product Finder (SANS catégorie - test général)...');

    const selection = {
      current_SALES: [1, 10000], // BSR 1-10000
      current_AMAZON: [1500, 5000] // Prix 15-50€
    };

    const params = {
      key: KEEPA_API_KEY,
      domain: 4, // Amazon.fr (France)
      selection: JSON.stringify(selection),
      page: 0,
      perPage: 10
    };

    console.log('Paramètres:', JSON.stringify(params, null, 2));
    console.log('');

    const response = await axios.get('https://api.keepa.com/query', { params });

    console.log('✅ API répond !');
    console.log(`   Total résultats: ${response.data.totalResults || 0}`);
    console.log(`   Produits retournés: ${response.data.products?.length || 0}`);

    if (response.data.products && response.data.products.length > 0) {
      console.log('');
      console.log('📦 Premier produit:');
      const p = response.data.products[0];
      console.log(`   ASIN: ${p.asin}`);
      console.log(`   Marque: ${p.brand || 'N/A'}`);
      console.log(`   Titre: ${p.title?.substring(0, 60)}...`);
      console.log(`   Catégorie ID: ${p.rootCategory}`);
    } else {
      console.log('');
      console.log('⚠️  Aucun produit trouvé - possible que:');
      console.log('   1. Les filtres sont trop restrictifs');
      console.log('   2. La clé Keepa n\'a pas accès au Product Finder');
      console.log('   3. Le plan Keepa ne supporte pas cette fonctionnalité');
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur Product Finder:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', JSON.stringify(error.response?.data, null, 2));
    return false;
  }
}

// Lancer les tests
(async () => {
  const tokensOk = await testTokens();

  if (tokensOk) {
    await testProductFinder();
  }

  console.log('');
  console.log('========================================');
  console.log('  Tests terminés');
  console.log('========================================');
})();
