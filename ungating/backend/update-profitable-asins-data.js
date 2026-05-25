#!/usr/bin/env node
/**
 * Met à jour les produits existants avec rating/reviews depuis Keepa
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const axios = require('axios');
const supabase = require('./config/supabase');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

async function updateExistingProducts() {
  console.log('🔄 MISE À JOUR DONNÉES EXISTANTES\n');
  console.log('='.repeat(60));

  try {
    // 1. Récupérer tous les ASIN de profitable_asins
    console.log('📦 Récupération des ASIN existants...');
    const { data: existingProducts, error: fetchError } = await supabase
      .from('profitable_asins')
      .select('asin, brand');

    if (fetchError) throw fetchError;

    console.log(`   ✅ ${existingProducts.length} produits à mettre à jour`);

    // 2. Récupérer détails depuis Keepa (par batch de 100)
    const asins = existingProducts.map(p => p.asin);
    const chunks = [];
    for (let i = 0; i < asins.length; i += 100) {
      chunks.push(asins.slice(i, i + 100));
    }

    let updated = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n🔍 Batch ${i + 1}/${chunks.length} (${chunk.length} ASIN)...`);

      const response = await axios.get('https://api.keepa.com/product', {
        params: {
          key: KEEPA_API_KEY,
          domain: 4,
          asin: chunk.join(','),
          stats: 365
        }
      });

      const products = response.data.products || [];

      // 3. Mettre à jour chaque produit
      for (const p of products) {
        const sellersCount = p.csv?.[11]?.[p.csv[11].length - 1] || 0;
        const rating = p.stats?.avg?.rating || p.rating || null;
        const reviewsCount = p.stats?.reviewCount || p.reviewCount || 0;

        const { error: updateError } = await supabase
          .from('profitable_asins')
          .update({
            rating: rating ? rating / 10 : null,
            reviews_count: reviewsCount,
            sellers_count: sellersCount
          })
          .eq('asin', p.asin);

        if (!updateError) {
          updated++;
          process.stdout.write(`\r   ✓ ${updated}/${existingProducts.length} mis à jour`);
        }
      }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log(`✅ ${updated} produits mis à jour avec rating/avis !`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

updateExistingProducts();
