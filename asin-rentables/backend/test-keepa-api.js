#!/usr/bin/env node
/**
 * Test basique de l'API Keepa pour diagnostiquer l'erreur 404
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

async function testKeepaEndpoints() {
  console.log('🧪 TEST API KEEPA\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Vérifier que la clé API fonctionne
    console.log('\n1️⃣ Test clé API (endpoint /token)...');
    const tokenResponse = await axios.get('https://api.keepa.com/token', {
      params: { key: KEEPA_API_KEY }
    });
    console.log(`   ✅ Clé valide - Tokens: ${tokenResponse.data.tokensLeft}`);

    // Test 2: Essayer Product Finder avec URL correcte
    console.log('\n2️⃣ Test Product Finder...');

    const selection = {
      current_SALES_gte: 1,
      current_SALES_lte: 10000,
      brandStoreName: ['babyliss']
    };

    console.log(`   URL: https://api.keepa.com/product`);
    console.log(`   Selection:`, JSON.stringify(selection, null, 2));

    const finderResponse = await axios.get('https://api.keepa.com/product', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify(selection),
        page: 0,
        perPage: 5
      }
    });

    console.log(`   ✅ Succès! ASINs trouvés: ${finderResponse.data.asinList?.length || 0}`);
    if (finderResponse.data.asinList) {
      console.log(`   Exemples:`, finderResponse.data.asinList.slice(0, 3));
    }

  } catch (error) {
    console.error('\n❌ ERREUR:');
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   URL: ${error.config?.url}`);
    console.error(`   Params:`, error.config?.params);

    if (error.response?.data) {
      console.error(`   Réponse Keepa:`, error.response.data);
    }
  }
}

testKeepaEndpoints();
