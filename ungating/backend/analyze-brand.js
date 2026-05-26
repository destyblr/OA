#!/usr/bin/env node
/**
 * Analyse une marque spécifique via Keepa
 * Sauvegarde les ASIN rentables dans Supabase
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const axios = require('axios');
const supabase = require('./config/supabase');
const fs = require('fs');
const path = require('path');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

// Parser les arguments
const args = process.argv.slice(2);
const brandName = args[0];
const maxTokens = parseInt(args.find(a => a.startsWith('--max-tokens='))?.split('=')[1] || '55');
const category = args.find(a => a.startsWith('--category='))?.split('=')[1] || 'Hygiène et Santé';

if (!brandName) {
  console.error('❌ Usage: node analyze-brand.js "BrandName" [--max-tokens=55] [--category="Beauté"]');
  process.exit(1);
}

/**
 * Vérifier tokens Keepa disponibles
 */
async function checkTokens() {
  const response = await axios.get('https://api.keepa.com/token', {
    params: { key: KEEPA_API_KEY }
  });
  return response.data.tokensLeft;
}

/**
 * Scanner la marque sur Keepa
 */
async function scanBrand() {
  console.log('\n🔍 SCAN KEEPA - ' + brandName.toUpperCase());
  console.log('='.repeat(70));
  console.log(`📦 Marque: ${brandName}`);
  console.log(`📂 Catégorie: ${category}`);
  console.log(`🎫 Limite: ${maxTokens} tokens`);
  console.log('='.repeat(70));

  // 1. Vérifier tokens
  console.log('\n💰 Étape 1: Vérification tokens...');
  const tokensAvailable = await checkTokens();
  console.log(`   Disponibles: ${tokensAvailable}`);

  if (tokensAvailable < maxTokens) {
    const waitTime = maxTokens - tokensAvailable;
    console.log(`   ⏳ Pas assez! Attendre ${waitTime} minutes...`);
    throw new Error(`Tokens insuffisants (${tokensAvailable}/${maxTokens})`);
  }

  // 2. Product Finder
  console.log('\n🔍 Étape 2: Recherche produits Keepa...');

  const maxProducts = maxTokens - 11; // 11 tokens pour la query

  // Filtrage avec current_AMAZON pour exclure Amazon directement
  const selection = {
    current_SALES_gte: 1,
    current_SALES_lte: 10000,
    current_BUY_BOX_SHIPPING_gte: 1500,  // Prix min: 15€
    current_BUY_BOX_SHIPPING_lte: 5000,  // Prix max: 50€
    current_AMAZON: -1,                   // Amazon ne vend pas (-1 = pas de prix Amazon)
    brandStoreName: [brandName.toLowerCase()]
  };

  console.log(`   🎯 Max produits: ${maxProducts}`);

  const response = await axios.get('https://api.keepa.com/query', {
    params: {
      key: KEEPA_API_KEY,
      domain: 4,
      selection: JSON.stringify(selection),
      page: 0,
      perPage: maxProducts
    }
  });

  const asins = response.data.asinList || [];
  console.log(`   ✅ ${asins.length} ASIN trouvés`);

  if (asins.length === 0) {
    console.log('\n   ℹ️  Aucun produit trouvé pour cette marque.');
    console.log('   💡 Vérifier:');
    console.log(`      - Le nom est correct: "${brandName}"`);
    console.log('      - La marque existe sur Amazon FR');
    console.log('      - Les filtres ne sont pas trop stricts');
    return { products: [], tokensUsed: 11 };
  }

  // 3. Récupérer détails
  console.log('\n📦 Étape 3: Récupération détails produits...');

  const detailsResponse = await axios.get('https://api.keepa.com/product', {
    params: {
      key: KEEPA_API_KEY,
      domain: 4,
      asin: asins.join(','),
      stats: 365  // Pas besoin d'offers, on filtre Amazon au niveau query
    }
  });

  const allProducts = (detailsResponse.data.products || []).map(p => {
    const lastBsr = p.csv?.[3]?.[p.csv[3].length - 1] || null;
    const lastPrice = p.csv?.[1]?.[p.csv[1].length - 1] || null;
    const sellersCount = p.csv?.[11]?.[p.csv[11].length - 1] || 0;

    // Amazon est déjà filtré au niveau de la query (current_AMAZON: -1)
    // Donc tous les produits ici n'ont PAS Amazon qui vend
    const amazonSelling = false;

    // Rating et avis depuis stats
    const rating = p.stats?.avg?.rating || p.rating || null;
    const reviewsCount = p.stats?.reviewCount || p.reviewCount || 0;

    return {
      asin: p.asin,
      brand: p.brand || brandName,
      title: p.title,
      bsr: lastBsr,
      price: lastPrice ? lastPrice / 100 : null,
      sellersCount: sellersCount,
      amazonSelling: amazonSelling,
      rating: rating ? rating / 10 : null, // Keepa rating est sur 50, on divise par 10 pour avoir sur 5
      reviewsCount: reviewsCount,
      imageUrl: p.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${p.imagesCSV.split(',')[0]}` : null,
      category: category,
      rootCategory: p.rootCategory
    };
  });

  // Filtrer: max 5 vendeurs (Amazon déjà filtré au niveau query)
  const products = allProducts.filter(p => {
    const passSellerFilter = p.sellersCount <= 5;

    // Log des produits
    if (!passSellerFilter) {
      console.log(`   ❌ Exclu: ${p.asin} - Vendeurs: ${p.sellersCount} (max 5: ✗)`);
    } else {
      console.log(`   ✅ OK: ${p.asin} - Vendeurs: ${p.sellersCount}`);
    }

    return passSellerFilter;
  });

  console.log(`   ✅ ${allProducts.length} produits trouvés → ${products.length} après filtre vendeurs (≤5, Amazon déjà exclu via query)`);

  // Tokens utilisés
  const tokensUsed = 11 + asins.length;
  console.log(`\n🎫 Tokens utilisés: ${tokensUsed} (query: 11 + détails: ${asins.length})`);

  return { products, tokensUsed };
}

/**
 * Sauvegarder dans Supabase
 */
async function saveToSupabase(products) {
  console.log('\n💾 Étape 4: Sauvegarde Supabase...');

  const saved = [];

  for (const product of products) {
    const { data, error } = await supabase
      .from('profitable_asins')
      .upsert({
        asin: product.asin,
        brand: product.brand,
        title: product.title,
        bsr: product.bsr,
        price_amazon: product.price,
        sellers_count: product.sellersCount,
        rating: product.rating,
        reviews_count: product.reviewsCount,
        image_url: product.imageUrl,
        category: product.category,
        source: 'keepa_brand_scan',
        scanned_at: new Date().toISOString()
      }, {
        onConflict: 'asin'
      })
      .select();

    if (!error) {
      saved.push(product);
    } else {
      console.log(`   ⚠️  Erreur ${product.asin}: ${error.message}`);
    }
  }

  console.log(`   ✅ ${saved.length}/${products.length} produits sauvegardés`);
  return saved;
}

/**
 * Afficher résumé
 */
function displaySummary(products) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(70));

  if (products.length === 0) {
    console.log('❌ Aucun produit trouvé');
    return;
  }

  // Trier par BSR
  const sorted = [...products].sort((a, b) => (a.bsr || 99999) - (b.bsr || 99999));

  // Stats
  const avgBsr = products.reduce((sum, p) => sum + (p.bsr || 0), 0) / products.length;
  const avgPrice = products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length;

  console.log(`📦 Produits trouvés: ${products.length}`);
  console.log(`📊 BSR moyen: ${Math.round(avgBsr).toLocaleString()}`);
  console.log(`💰 Prix moyen: ${avgPrice.toFixed(2)}€`);

  console.log('\n🏆 TOP 10 MEILLEURS BSR:');
  sorted.slice(0, 10).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.asin} | BSR: ${(p.bsr || 0).toLocaleString().padEnd(8)} | ${p.price?.toFixed(2)}€ | ${p.title?.substring(0, 40)}`);
  });

  console.log('\n✅ Résultats disponibles dans le dashboard:');
  console.log('   🌐 https://oa-fba.netlify.app');
  console.log('   📂 Onglet: "🏆 ASIN Rentables"');
  console.log('='.repeat(70));
}

/**
 * Main
 */
async function main() {
  try {
    const { products, tokensUsed } = await scanBrand();

    if (products.length > 0) {
      await saveToSupabase(products);
    }

    displaySummary(products);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
