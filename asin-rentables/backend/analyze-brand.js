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
const category = args.find(a => a.startsWith('--category='))?.split('=')[1] || 'Hygiène et Santé';
const REFRESH_DAYS = 3; // Re-scanner les ASIN après 3 jours

if (!brandName) {
  console.error('❌ Usage: node analyze-brand.js "BrandName" [--category="Beauté"]');
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
 * Filtrer les ASIN qui ont besoin d'être scannés
 * Exclure ceux scannés il y a moins de REFRESH_DAYS jours
 */
async function filterAsinsToScan(asins) {
  if (asins.length === 0) return [];

  // Récupérer les ASIN existants de la base
  const { data: existing, error } = await supabase
    .from('profitable_asins')
    .select('asin, scanned_at')
    .in('asin', asins);

  if (error) {
    console.log(`   ⚠️  Erreur lecture DB: ${error.message}`);
    return asins; // En cas d'erreur, scanner tous
  }

  if (!existing || existing.length === 0) {
    console.log(`   ✅ Tous nouveaux: ${asins.length} ASIN à scanner`);
    return asins;
  }

  // Créer un Map pour lookup rapide
  const existingMap = new Map(existing.map(e => [e.asin, e.scanned_at]));

  const now = new Date();
  const refreshThreshold = REFRESH_DAYS * 24 * 60 * 60 * 1000; // jours → millisecondes

  const toScan = [];
  const skipped = [];

  for (const asin of asins) {
    const scannedAt = existingMap.get(asin);

    if (!scannedAt) {
      // Nouveau ASIN
      toScan.push(asin);
    } else {
      // Vérifier âge
      const ageMs = now - new Date(scannedAt);
      if (ageMs >= refreshThreshold) {
        // Assez vieux, refresh
        toScan.push(asin);
      } else {
        // Trop récent, skip
        skipped.push(asin);
      }
    }
  }

  console.log(`   📊 Filtrage refresh (${REFRESH_DAYS} jours):`);
  console.log(`      Nouveaux + anciens: ${toScan.length}`);
  console.log(`      Déjà scannés (<${REFRESH_DAYS}j): ${skipped.length}`);
  console.log(`      → TOTAL à scanner: ${toScan.length}/${asins.length}`);

  return toScan;
}

/**
 * Attendre que les tokens se rechargent
 */
async function waitForTokens(needed) {
  const current = await checkTokens();
  if (current >= needed) return current;

  const waitMinutes = needed - current;
  console.log(`\n⏳ Attente de ${waitMinutes} minute(s) pour avoir ${needed} tokens...`);
  console.log(`   Tokens actuels: ${current}`);
  console.log(`   Tokens nécessaires: ${needed}`);

  // Attendre par intervalles de 1 minute et afficher progression
  for (let i = 0; i < waitMinutes; i++) {
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
    const now = await checkTokens();
    process.stdout.write(`\r   ⏳ Attente... ${i + 1}/${waitMinutes} min - Tokens: ${now}`);
  }

  console.log('\n   ✅ Tokens disponibles !');
  return await checkTokens();
}

/**
 * Scanner la marque sur Keepa avec système de batches
 */
async function scanBrand() {
  console.log('\n🔍 SCAN KEEPA - ' + brandName.toUpperCase());
  console.log('='.repeat(70));
  console.log(`📦 Marque: ${brandName}`);
  console.log(`📂 Catégorie: ${category}`);
  console.log(`🔄 Mode: Batches automatiques (5 ASIN/batch)`);
  console.log('='.repeat(70));

  // 1. Vérifier tokens pour la query (besoin: 11 tokens)
  console.log('\n💰 Étape 1: Vérification tokens...');
  let tokensAvailable = await waitForTokens(11);
  console.log(`   Disponibles: ${tokensAvailable}`);
  console.log(`   Coût query: 11 tokens (fixed)`);
  console.log(`   💡 Les batches démarreront automatiquement après`);

  // 2. Product Finder
  console.log('\n🔍 Étape 2: Recherche produits Keepa...');

  const selection = {
    current_SALES_gte: 15000,  // Skip top 15k (zone Amazon)
    current_SALES_lte: 25000,  // Jusqu'à 25k (8-25 ventes/mois)
    current_BUY_BOX_SHIPPING_gte: 1500,  // Prix min: 15€
    current_BUY_BOX_SHIPPING_lte: 5000,  // Prix max: 50€
    brandStoreName: [brandName.toLowerCase()]
  };

  const response = await axios.get('https://api.keepa.com/query', {
    params: {
      key: KEEPA_API_KEY,
      domain: 4,
      selection: JSON.stringify(selection),
      page: 0,
      perPage: 200  // Max ASIN par query
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

  // 3. Filtrer les ASIN à scanner (skip ceux < 3 jours)
  console.log('\n🔄 Étape 3: Filtrage refresh...');
  const asinsToScan = await filterAsinsToScan(asins);

  if (asinsToScan.length === 0) {
    console.log('\n   ✅ Tous les ASIN sont à jour (scannés < 3 jours)');
    console.log('   💡 Rien à faire, données déjà fraîches !');
    return { products: [], tokensUsed: 11 };
  }

  // 4. Traiter par batches de 5 ASIN
  console.log('\n📦 Étape 4: Traitement par batches (5 ASIN/batch)...');

  const BATCH_SIZE = 5;
  const TOKENS_NEEDED_PER_BATCH = 50; // Sécurité: attendre d'avoir 50 tokens avant chaque batch

  const batches = [];
  for (let i = 0; i < asinsToScan.length; i += BATCH_SIZE) {
    batches.push(asinsToScan.slice(i, i + BATCH_SIZE));
  }

  console.log(`   📊 ${asinsToScan.length} ASIN → ${batches.length} batches à traiter`);
  console.log(`   💡 Sauvegarde après chaque batch - Ctrl+C pour arrêter`);

  let allProducts = [];
  let totalTokensUsed = 11; // Query déjà faite

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchNum = batchIndex + 1;

    console.log(`\n   🔄 Batch ${batchNum}/${batches.length} (${batch.length} ASIN)...`);

    // Attendre d'avoir 50 tokens avant de continuer
    await waitForTokens(TOKENS_NEEDED_PER_BATCH);

    // Récupérer détails avec offers pour ce batch
    const detailsResponse = await axios.get('https://api.keepa.com/product', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4,
        asin: batch.join(','),
        stats: 365,
        offers: 20  // Nécessaire pour détecter Amazon correctement
      }
    });

    const batchTokenCost = batch.length * 7; // ~7 tokens/ASIN avec stats + offers
    totalTokensUsed += batchTokenCost;

    const batchProducts = (detailsResponse.data.products || []).map(p => {
      const lastBsr = p.csv?.[3]?.[p.csv[3].length - 1] || null;
      const lastPrice = p.csv?.[1]?.[p.csv[1].length - 1] || null;
      const sellersCount = p.csv?.[11]?.[p.csv[11].length - 1] || 0;

      // Détecter Amazon via offers
      const amazonSelling = p.offers && Array.isArray(p.offers)
        ? p.offers.some(offer => offer.isAmazon === true)
        : false;

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
        rating: rating ? rating / 10 : null,
        reviewsCount: reviewsCount,
        imageUrl: p.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${p.imagesCSV.split(',')[0]}` : null,
        category: category,
        rootCategory: p.rootCategory
      };
    });

    // Évaluer et marquer TOUS les produits avec leur status
    const evaluatedProducts = batchProducts.map(p => {
      const passSellerFilter = p.sellersCount <= 8;  // Max 8 vendeurs (compromis)
      const passAmazonFilter = !p.amazonSelling;

      let status = 'approved';
      let rejectionReason = null;

      if (!passAmazonFilter && !passSellerFilter) {
        status = 'rejected';
        rejectionReason = 'both';
        console.log(`      ❌ ${p.asin} - Vendeurs: ${p.sellersCount} ✗ | Amazon: ✗ VEND`);
      } else if (!passAmazonFilter) {
        status = 'rejected';
        rejectionReason = 'amazon_sells';
        console.log(`      ❌ ${p.asin} - Vendeurs: ${p.sellersCount} ✓ | Amazon: ✗ VEND`);
      } else if (!passSellerFilter) {
        status = 'rejected';
        rejectionReason = 'too_many_sellers';
        console.log(`      ❌ ${p.asin} - Vendeurs: ${p.sellersCount} ✗ | Amazon: ✓`);
      } else {
        console.log(`      ✅ ${p.asin} - Vendeurs: ${p.sellersCount} | OK`);
      }

      return { ...p, status, rejectionReason };
    });

    // Sauvegarder TOUS les produits (approved + rejected)
    console.log(`      💾 Sauvegarde ${evaluatedProducts.length} produit(s)...`);
    const saved = await saveBatchToSupabase(evaluatedProducts);
    console.log(`      ✅ ${saved.length} sauvegardé(s) en DB`);

    // Compter seulement les approved pour le total
    const approvedProducts = evaluatedProducts.filter(p => p.status === 'approved');
    allProducts = allProducts.concat(approvedProducts);
    console.log(`      → Batch: ${approvedProducts.length}/${batch.length} OK | Total cumulé: ${allProducts.length}`);
    console.log(`      💡 Ctrl+C pour arrêter (données déjà sauvées)`);
  }

  console.log(`\n   ✅ Scan terminé: ${allProducts.length} produits rentables trouvés`);
  console.log(`   🎫 Tokens utilisés: ${totalTokensUsed} (query: 11 + batches: ${totalTokensUsed - 11})`);

  return { products: allProducts, tokensUsed: totalTokensUsed };
}

/**
 * Sauvegarder un batch dans Supabase (appelé après chaque batch)
 */
async function saveBatchToSupabase(products) {
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
        status: product.status || 'approved',
        rejection_reason: product.rejectionReason || null,
        source: 'keepa_brand_scan',
        scanned_at: new Date().toISOString()
      }, {
        onConflict: 'asin'
      })
      .select();

    if (!error) {
      saved.push(product);
    } else {
      console.log(`         ⚠️  Erreur ${product.asin}: ${error.message}`);
    }
  }

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

    // Produits déjà sauvegardés après chaque batch
    displaySummary(products);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
