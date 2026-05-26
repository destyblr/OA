#!/usr/bin/env node
/**
 * Tester différents filtres Keepa pour exclure Amazon
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

async function testFilters() {
  console.log('🧪 TEST FILTRES KEEPA POUR EXCLURE AMAZON\n');
  console.log('='.repeat(70));

  // Test 1: Filtre availabilityAmazon
  console.log('\n📋 Test 1: availabilityAmazon = -1 (Amazon pas dispo)');
  try {
    const test1 = {
      current_SALES_gte: 1,
      current_SALES_lte: 5000,
      current_BUY_BOX_SHIPPING_gte: 1500,
      current_BUY_BOX_SHIPPING_lte: 5000,
      availabilityAmazon: -1  // -1 = Amazon ne vend pas
    };

    const response1 = await axios.get('https://api.keepa.com/query', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify(test1),
        page: 0,
        perPage: 5
      }
    });

    console.log(`   Résultat: ${response1.data.asinList?.length || 0} ASIN trouvés`);
    if (response1.data.asinList?.length > 0) {
      console.log(`   ✅ FONCTIONNE ! Exemples: ${response1.data.asinList.slice(0, 3).join(', ')}`);
    }
  } catch (e) {
    console.log(`   ❌ Erreur: ${e.response?.data?.error || e.message}`);
  }

  // Test 2: Filtre current_AMAZON = -1
  console.log('\n📋 Test 2: current_AMAZON = -1 (prix Amazon = -1)');
  try {
    const test2 = {
      current_SALES_gte: 1,
      current_SALES_lte: 5000,
      current_BUY_BOX_SHIPPING_gte: 1500,
      current_BUY_BOX_SHIPPING_lte: 5000,
      current_AMAZON: -1  // Prix Amazon = -1 (pas de prix)
    };

    const response2 = await axios.get('https://api.keepa.com/query', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify(test2),
        page: 0,
        perPage: 5
      }
    });

    console.log(`   Résultat: ${response2.data.asinList?.length || 0} ASIN trouvés`);
    if (response2.data.asinList?.length > 0) {
      console.log(`   ✅ FONCTIONNE ! Exemples: ${response2.data.asinList.slice(0, 3).join(', ')}`);
    }
  } catch (e) {
    console.log(`   ❌ Erreur: ${e.response?.data?.error || e.message}`);
  }

  // Test 3: Filtre oos_AMAZON = true (Amazon out of stock)
  console.log('\n📋 Test 3: oos_AMAZON = true (Amazon rupture)');
  try {
    const test3 = {
      current_SALES_gte: 1,
      current_SALES_lte: 5000,
      current_BUY_BOX_SHIPPING_gte: 1500,
      current_BUY_BOX_SHIPPING_lte: 5000,
      oos_AMAZON: true  // Amazon out of stock
    };

    const response3 = await axios.get('https://api.keepa.com/query', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify(test3),
        page: 0,
        perPage: 5
      }
    });

    console.log(`   Résultat: ${response3.data.asinList?.length || 0} ASIN trouvés`);
    if (response3.data.asinList?.length > 0) {
      console.log(`   ✅ FONCTIONNE ! Exemples: ${response3.data.asinList.slice(0, 3).join(', ')}`);
    }
  } catch (e) {
    console.log(`   ❌ Erreur: ${e.response?.data?.error || e.message}`);
  }

  // Test 4: Liste des filtres disponibles
  console.log('\n📋 Test 4: Récupérer les filtres disponibles');
  try {
    // Faire une requête basique et voir les champs retournés
    const responseBasic = await axios.get('https://api.keepa.com/query', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify({
          current_SALES_gte: 1,
          current_SALES_lte: 1000
        }),
        page: 0,
        perPage: 1
      }
    });

    console.log(`   Champs disponibles dans la réponse:`);
    console.log(`   ${Object.keys(responseBasic.data).join(', ')}`);
  } catch (e) {
    console.log(`   ❌ Erreur: ${e.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Tests terminés !');
  console.log('='.repeat(70));
}

testFilters();
