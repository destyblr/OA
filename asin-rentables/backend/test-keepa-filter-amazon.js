#!/usr/bin/env node
/**
 * Test UNIQUE: Filtre current_AMAZON pour exclure Amazon
 * Coût: 11 tokens seulement
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

async function testAmazonFilter() {
  console.log('🧪 TEST FILTRE: current_AMAZON = -1\n');
  console.log('='.repeat(60));
  console.log('Coût: 11 tokens (query uniquement)');
  console.log('='.repeat(60));

  try {
    // Filtre: current_AMAZON = -1 signifie Amazon ne vend pas
    const selection = {
      current_SALES_gte: 1,
      current_SALES_lte: 5000,
      current_BUY_BOX_SHIPPING_gte: 1500,
      current_BUY_BOX_SHIPPING_lte: 5000,
      current_AMAZON: -1  // ← FILTRE AMAZON
    };

    console.log('\n📋 Filtre testé:');
    console.log(JSON.stringify(selection, null, 2));

    const response = await axios.get('https://api.keepa.com/query', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify(selection),
        page: 0,
        perPage: 10  // Seulement 10 pour tester
      }
    });

    const asins = response.data.asinList || [];

    console.log('\n📊 RÉSULTAT:');
    console.log(`   ASIN trouvés: ${asins.length}`);

    if (asins.length > 0) {
      console.log(`\n   ✅ LE FILTRE FONCTIONNE !`);
      console.log(`   Exemples ASIN (Amazon ne vend pas):`);
      asins.slice(0, 5).forEach((asin, i) => {
        console.log(`      ${i + 1}. ${asin}`);
      });

      console.log('\n   🎯 SOLUTION TROUVÉE:');
      console.log('   → On peut filtrer Amazon au niveau query !');
      console.log('   → Pas besoin du paramètre "offers" !');
      console.log('   → Coût: 11 query + 1 token/ASIN = ~61 tokens/marque');
    } else {
      console.log(`\n   ❌ Le filtre ne fonctionne pas OU aucun produit`);
      console.log('   Il faudra une autre solution');
    }

  } catch (error) {
    console.log('\n❌ ERREUR:');
    if (error.response?.data) {
      console.log(`   Message: ${error.response.data.error || error.response.data}`);
      console.log(`   Le filtre "current_AMAZON" n'existe peut-être pas`);
    } else {
      console.log(`   ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

testAmazonFilter();
