#!/usr/bin/env node
/**
 * Scan exploratoire pour découvrir les rootCategory disponibles
 */

require('dotenv').config();
const keepaAPI = require('./services/keepa-api');

async function discoverCategories() {
  console.log('🔍 SCAN EXPLORATOIRE - Découverte des catégories\n');
  console.log('='.repeat(60));
  console.log('Paramètres:');
  console.log('  - BSR: 1-10000');
  console.log('  - Prix: 15-50€');
  console.log('  - Vendeurs FBA: 0-5');
  console.log('  - Pas de catégorie (scan large)');
  console.log('='.repeat(60) + '\n');

  try {
    // Scanner sans catégorie
    const result = await keepaAPI.productFinder({
      category: null, // PAS DE CATÉGORIE
      bsrRange: [1, 10000],
      priceRange: [1500, 5000],
      minRating: 400,
      maxSellers: 5,
      excludeAmazon: true,
      page: 1,
      perPage: 30
    });

    console.log(`\n✅ ${result.products.length} produits trouvés\n`);
    console.log('='.repeat(60));

    // Grouper par rootCategory
    const categoryMap = new Map();

    result.products.forEach(product => {
      const rootCat = product.rootCategory || 'Unknown';
      const catName = product.categoryTree?.[0]?.name || 'Unknown';

      if (!categoryMap.has(rootCat)) {
        categoryMap.set(rootCat, {
          rootCategory: rootCat,
          name: catName,
          count: 0,
          examples: []
        });
      }

      const cat = categoryMap.get(rootCat);
      cat.count++;
      if (cat.examples.length < 3) {
        cat.examples.push({
          asin: product.asin,
          brand: product.brand,
          title: product.title?.substring(0, 50)
        });
      }
    });

    // Afficher les résultats triés par nombre de produits
    console.log('\n📊 CATÉGORIES TROUVÉES (triées par nombre de produits):\n');

    const categories = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count);

    categories.forEach((cat, index) => {
      console.log(`${index + 1}. 🏷️  ${cat.name}`);
      console.log(`   rootCategory: ${cat.rootCategory}`);
      console.log(`   Produits: ${cat.count}`);
      console.log(`   Exemples:`);
      cat.examples.forEach(ex => {
        console.log(`      - ${ex.asin}: ${ex.brand} - ${ex.title}...`);
      });
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('\n💡 PROCHAINE ÉTAPE:');
    console.log('   Dis-moi quelles catégories FNAC Pro vend parmi celles-ci,');
    console.log('   et je configure les rotations avec ces rootCategory.\n');
    console.log('='.repeat(60));

    // Sauvegarder les résultats
    console.log(`\n💾 Tokens utilisés: ${result.tokensUsed}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

discoverCategories();
