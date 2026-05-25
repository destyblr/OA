#!/usr/bin/env node
/**
 * Test ultra basique: chercher N'IMPORTE QUEL produit pour vérifier que Keepa fonctionne
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

async function testBasic() {
  console.log('🧪 TEST KEEPA BASIQUE\n');

  try {
    // Test 1: Chercher n'importe quels produits Beauty
    console.log('1️⃣ Chercher 5 produits au hasard (catégorie Beauty)...');
    let response = await axios.get('https://api.keepa.com/product', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        selection: JSON.stringify({
          rootCategory: [3760911], // Beauty
          current_SALES_gte: 1,
          current_SALES_lte: 5000
        }),
        page: 0,
        perPage: 5
      }
    });

    const asins = response.data.asinList || [];
    console.log(`   ✅ Trouvé: ${asins.length} ASINs`);

    if (asins.length > 0) {
      console.log(`   Exemples: ${asins.join(', ')}`);

      // Récupérer les détails pour voir les marques
      console.log('\n2️⃣ Récupération détails...');
      const detailsResponse = await axios.get('https://api.keepa.com/product', {
        params: {
          key: KEEPA_API_KEY,
          domain: 4,
          asin: asins.join(',')
        }
      });

      const products = detailsResponse.data.products || [];
      console.log(`\n   📦 Produits trouvés:`);
      products.forEach(p => {
        console.log(`      ${p.asin} - Marque: "${p.brand}" - ${p.title?.substring(0, 50)}`);
      });

      // Vérifier tokens utilisés
      const tokenCheck = await axios.get('https://api.keepa.com/token', {
        params: { key: KEEPA_API_KEY }
      });
      console.log(`\n   🎫 Tokens restants: ${tokenCheck.data.tokensLeft}`);

    } else {
      console.log('   ❌ Aucun produit trouvé - Problème avec Keepa!');
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

testBasic();
