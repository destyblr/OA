#!/usr/bin/env node
/**
 * Test pour trouver le bon category ID Keepa
 */

require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

// ASIN d'un produit Bébé connu (Biolane Lingettes)
const BABY_ASIN = 'B0CZB85KX2';

async function getCategoryFromAsin(asin) {
  try {
    console.log(`🔍 Récupération catégorie pour ASIN: ${asin}\n`);

    const params = {
      key: KEEPA_API_KEY,
      domain: 4,
      asin: asin
    };

    const response = await axios.get('https://api.keepa.com/product', { params });

    if (response.data.products && response.data.products.length > 0) {
      const product = response.data.products[0];

      console.log(`📦 Produit: ${product.title?.substring(0, 60)}...`);
      console.log(`🏷️  Marque: ${product.brand || 'N/A'}`);
      console.log(`\n📂 Categories Keepa:`);
      console.log(`   Root Category: ${product.rootCategory}`);
      console.log(`   Category Tree: ${JSON.stringify(product.categoryTree, null, 2)}`);
      console.log(`\n💡 Amazon Categories:`);
      console.log(`   ${JSON.stringify(product.categories, null, 2)}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

getCategoryFromAsin(BABY_ASIN);
