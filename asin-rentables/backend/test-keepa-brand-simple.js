#!/usr/bin/env node
/**
 * Test simplifié pour trouver des produits Babyliss
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

async function testSimple() {
  console.log('🧪 TEST BABYLISS - VERSION SIMPLIFIÉE\n');

  try {
    // Test 1: Sans filtres - juste la marque
    console.log('1️⃣ Test avec JUSTE brandStoreName...');
    let response = await axios.get('https://api.keepa.com/product', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify({
          brandStoreName: ['babyliss']
        }),
        page: 0,
        perPage: 10
      }
    });
    console.log(`   Résultats: ${response.data.asinList?.length || 0} ASINs`);
    if (response.data.asinList?.length > 0) {
      console.log(`   ✅ Trouvé:`, response.data.asinList.slice(0, 3));
    }

    // Test 2: Avec brand (pas brandStoreName)
    console.log('\n2️⃣ Test avec brand (au lieu de brandStoreName)...');
    response = await axios.get('https://api.keepa.com/product', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify({
          brand: ['Babyliss', 'BaByliss', 'BABYLISS']
        }),
        page: 0,
        perPage: 10
      }
    });
    console.log(`   Résultats: ${response.data.asinList?.length || 0} ASINs`);
    if (response.data.asinList?.length > 0) {
      console.log(`   ✅ Trouvé:`, response.data.asinList.slice(0, 3));
    }

    // Test 3: Via Search API (recherche texte)
    console.log('\n3️⃣ Test avec Search API...');
    response = await axios.get('https://api.keepa.com/search', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        type: 'product',
        term: 'babyliss',
        page: 0,
        perPage: 10
      }
    });
    console.log(`   Résultats: ${response.data.asinList?.length || 0} ASINs`);
    if (response.data.asinList?.length > 0) {
      console.log(`   ✅ Trouvé:`, response.data.asinList.slice(0, 3));
    }

    // Test 4: Category + term
    console.log('\n4️⃣ Test avec category=Beauty + term...');
    response = await axios.get('https://api.keepa.com/product', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify({
          rootCategory: [3760911], // Beauty category
          brandStoreName: ['babyliss']
        }),
        page: 0,
        perPage: 10
      }
    });
    console.log(`   Résultats: ${response.data.asinList?.length || 0} ASINs`);
    if (response.data.asinList?.length > 0) {
      console.log(`   ✅ Trouvé:`, response.data.asinList.slice(0, 3));
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

testSimple();
