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

// Test 2: Product Finder simple
async function testProductFinder() {
  try {
    console.log('🔍 Test 2: Product Finder (Bébé, simple)...');

    const selection = {
      rootCategory: 1063252, // Baby
      current_SALES: [1, 50000], // BSR très large
      current_AMAZON: [1000, 10000] // Prix 10-100€
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
