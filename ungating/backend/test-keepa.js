#!/usr/bin/env node
/**
 * Test de la clé Keepa API
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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

// Test 2: Product Finder avec récupération des détails
async function testProductFinder() {
  try {
    console.log('🔍 Test 2: Product Finder + détails produits...');

    // Étape 1: Query pour obtenir les ASIN
    const selection = {
      current_SALES_gte: 1,
      current_SALES_lte: 10000,
      current_BUY_BOX_SHIPPING_gte: 1500,
      current_BUY_BOX_SHIPPING_lte: 5000,
      current_COUNT_NEW_FBA_gte: 0,
      current_COUNT_NEW_FBA_lte: 5,
      productType: ['0'],
      rootCategory: 322086011  // Test Jeux et Jouets
    };

    console.log('Selection:', JSON.stringify(selection, null, 2));

    const params = {
      key: KEEPA_API_KEY,
      domain: 4,
      selection: JSON.stringify(selection),
      sort: JSON.stringify([['current_SALES', 'asc']]),
      page: 0,
      perPage: 10, // Juste 10 pour tester
      stats: 90
    };

    console.log('Étape 1: Récupération des ASIN...');
    const queryResponse = await axios.get('https://api.keepa.com/query', { params });

    console.log(`✅ ${queryResponse.data.asinList?.length || 0} ASIN trouvés`);
    console.log(`🎫 Tokens query: ${queryResponse.data.tokensConsumed}`);
    console.log(`💰 Tokens restants: ${queryResponse.data.tokensLeft}`);

    if (!queryResponse.data.asinList || queryResponse.data.asinList.length === 0) {
      console.log('⚠️  Aucun ASIN trouvé');
      return true;
    }

    // Étape 2: Récupérer les détails des 3 premiers ASIN
    console.log('');
    console.log('Étape 2: Récupération des détails (3 premiers ASIN)...');
    const testAsins = queryResponse.data.asinList.slice(0, 3).join(',');

    const productParams = {
      key: KEEPA_API_KEY,
      domain: 4,
      asin: testAsins,
      stats: 90
    };

    const productResponse = await axios.get('https://api.keepa.com/product', { params: productParams });

    console.log(`✅ ${productResponse.data.products?.length || 0} produits avec détails`);
    console.log(`🎫 Tokens product: ${productResponse.data.tokensConsumed}`);
    console.log(`💰 Tokens restants: ${productResponse.data.tokensLeft}`);

    if (productResponse.data.products && productResponse.data.products.length > 0) {
      console.log('');
      console.log('📦 Premier produit:');
      const p = productResponse.data.products[0];
      console.log(`   ASIN: ${p.asin}`);
      console.log(`   Marque: ${p.brand || 'N/A'}`);
      console.log(`   Titre: ${p.title?.substring(0, 60)}...`);
      console.log(`   BSR: ${p.stats?.current[3] || 'N/A'}`);
      console.log(`   Prix: ${(p.stats?.current[0] / 100 || 0).toFixed(2)}€`);
    }

    console.log('');
    console.log(`💡 Coût total: ${queryResponse.data.tokensConsumed + productResponse.data.tokensConsumed} tokens`);

    return true;
  } catch (error) {
    console.error('❌ Erreur:');
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
