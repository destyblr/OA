#!/usr/bin/env node
/**
 * Test pour trouver tous les rootCategory des catégories FNAC
 */

require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

const ASIN_TO_TEST = {
  'Petit électroménager': 'B07G7CZ3BY',
  'Beauté': 'B0FVG31YWL',
  'Hygiène': 'B0FGCR572',
  'Jouets': 'B0F6XVBS9Q',
  'High-Tech': 'B0FSHKZ2XT'
};

async function getCategoryFromAsin(category, asin) {
  try {
    const params = {
      key: KEEPA_API_KEY,
      domain: 4,
      asin: asin
    };

    const response = await axios.get('https://api.keepa.com/product', { params });

    if (response.data.products && response.data.products.length > 0) {
      const product = response.data.products[0];
      console.log(`\n✅ ${category} (${asin})`);
      console.log(`   Produit: ${product.title?.substring(0, 60)}...`);
      console.log(`   Marque: ${product.brand || 'N/A'}`);
      console.log(`   🎯 ROOT CATEGORY: ${product.rootCategory}`);
      console.log(`   Category Tree: ${JSON.stringify(product.categoryTree?.[0], null, 2)}`);

      return {
        category,
        asin,
        rootCategory: product.rootCategory,
        categoryName: product.categoryTree?.[0]?.name || 'Unknown'
      };
    } else {
      console.log(`\n❌ ${category} (${asin}): Pas de données`);
      return null;
    }
  } catch (error) {
    console.log(`\n❌ ${category} (${asin}): ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

(async () => {
  console.log('🔍 Recherche des rootCategory pour les catégories FNAC\n');
  console.log('='.repeat(60));

  const results = [];

  for (const [category, asin] of Object.entries(ASIN_TO_TEST)) {
    const result = await getCategoryFromAsin(category, asin);
    if (result) {
      results.push(result);
    }
    // Petite pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 RÉSUMÉ DES ROOT CATEGORIES:\n');

  results.forEach(r => {
    console.log(`${r.category}: ${r.rootCategory} (${r.categoryName})`);
  });

  console.log('\n' + '='.repeat(60));
})();
