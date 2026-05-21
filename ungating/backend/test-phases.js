#!/usr/bin/env node
/**
 * Test des phases 2-8 sans utiliser de tokens Keepa
 * Simule des produits venant de Keepa Phase 1
 */

require('dotenv').config();
const spAPI = require('./services/sp-api');
const scanTracker = require('./services/scan-tracker');
const supabase = require('./config/supabase');
const keepaAPI = require('./services/keepa-api');

// Mots-clés Hazmat (copié de brand-finder.js)
const HAZMAT_KEYWORDS = [
  'spray', 'aerosol', 'aérosol',
  'battery', 'batterie', 'lithium',
  'liquide', 'liquid',
  'parfum', 'perfume', 'fragrance',
  'vernis', 'nail polish',
  'flammable', 'inflammable',
  'alcohol', 'alcool',
  'cleaning', 'nettoyant'
];

// Marques Private Label Amazon (à exclure)
const PRIVATE_LABEL_BRANDS = [
  'Amazon Basics',
  'Amazon Essentials',
  'Amazon Collection',
  'Amazon Elements',
  'Amazon Commercial',
  'Solimo'
];

// VRAIS ASIN retournés par Keepa dans le test précédent
const realAsins = [
  "B0DHSDWPP2", "B0C5DB72QZ", "B00O247Z1W", "B0G5Q6V59K", "B0FDFRP3M4",
  "B08HSHWG89", "B0B58TSPGR", "B0DHSDJ148", "B0DYF7HLQ2", "B0DQDJ4SGF",
  "B0D1G66H4Y", "B0FDKVSBKR", "B0C5D736R5", "B0FDKVQ5PN", "B0FDKV1SBY",
  "B00F37PSRU", "B0C5D8BVM7", "B0FFSWS7WQ", "B0DK3X47X6", "B0FDFVJCTH",
  "B0GYLQ59Z8", "B016C6EOO8", "B00MW8G6OC", "B00O2BE7LQ", "B0DK3S1Y53",
  "B0C5D5N75W", "B0CC27ZMV2", "B01FSGVN4M", "B0B3MKD39C", "B0FFSXHDKY",
  "B0FGPFCV9Z", "B0C5D7YV86", "B0D37NZJ3W", "B0C5D6LRJ8", "B0DK3VDXHH",
  "B092JLV7JX", "B0C5D67Y58", "B0DHS9Y433", "B0FFSVKS5N", "B0FDFTC1F9",
  "B010G0FU9Y", "B0FGQLG1TD", "B0C5D6XX1W", "B0GL3VZFK2", "B0C5D938KS",
  "B0C5D7PMFD", "B0D7HK7712", "B0C5D64Z9B", "B0D8SZ8CMQ", "B0FFSSTBXC"
];

async function testAllPhases() {
  console.log('\n========================================');
  console.log('  TEST DES PHASES 2-8 (AVEC VRAIS ASIN)');
  console.log('========================================\n');

  // Phase 1: Récupérer les détails des 8 premiers ASIN via Keepa
  console.log('📦 Phase 1 : Keepa Product Details (8 premiers ASIN)\n');
  const testAsins = realAsins.slice(0, 8); // Prendre 8 ASIN pour économiser
  console.log(`   Récupération des détails pour ${testAsins.length} ASIN...`);

  const asinString = testAsins.join(',');
  const rawProducts = await keepaAPI.getProduct(asinString);

  if (!rawProducts || !Array.isArray(rawProducts)) {
    console.error('   ❌ Erreur: Aucun produit retourné par Keepa');
    return;
  }

  console.log(`   ✅ ${rawProducts.length} produits récupérés\n`);

  // DEBUG: Afficher les données du premier produit
  console.log('🔍 DEBUG: Premier produit:');
  console.log(`   ASIN: ${rawProducts[0].asin}`);
  console.log(`   Title: ${rawProducts[0].title}`);
  console.log(`   Rating: ${rawProducts[0].rating}`);
  console.log(`   Review Count: ${rawProducts[0].reviewCount}`);
  console.log(`   Seller Count: ${rawProducts[0].sellerCount}`);
  console.log(`   BSR: ${rawProducts[0].bsr}`);
  console.log(`   Price: ${rawProducts[0].price}€\n`);

  // Phase 2: Filtre Hazmat
  console.log('⚠️  Phase 2 : Filtre Hazmat (mots-clés)\n');
  let products = rawProducts.filter(p => {
    const isHazmat = HAZMAT_KEYWORDS.some(kw =>
      (p.title || '').toLowerCase().includes(kw)
    );

    if (isHazmat) {
      console.log(`   ❌ HAZMAT détecté: ${p.title}`);
    }

    return !isHazmat;
  });
  console.log(`   ✅ ${products.length} ASIN après filtre Hazmat\n`);

  // Phase 2b: Filtre Private Labels Amazon
  console.log('🏷️  Phase 2b : Filtre Private Labels Amazon\n');
  products = products.filter(p => {
    const isPrivateLabel = PRIVATE_LABEL_BRANDS.some(brand =>
      (p.brand || '').toLowerCase().includes(brand.toLowerCase())
    );

    if (isPrivateLabel) {
      console.log(`   ❌ Private Label: ${p.brand}`);
    }

    return !isPrivateLabel;
  });
  console.log(`   ✅ ${products.length} ASIN après filtre Private Label\n`);

  // Phase 3: SP-API Check (DÉSACTIVÉ temporairement - problème d'endpoint)
  console.log('🔐 Phase 3 : Vérification SP-API (SKIP - désactivé)\n');
  console.log('   ⚠️  SP-API désactivé pour ce test (problème d\'endpoints)');
  console.log('   ℹ️  En production, sera utilisé pour vérifier restrictions/Hazmat\n');

  // Simuler des résultats SP-API
  for (const product of products) {
    product.isRestricted = true; // Simuler restriction (pour tester la suite)
    product.restrictionType = 'approval_required';
    product.isHazmat = false;
    console.log(`   ${product.asin} - Restreint: ✅ (simulé) | Hazmat: ✅ (simulé)`);
  }

  console.log(`   ✅ ${products.length} ASIN après vérification (simulée)\n`);

  // Phase 4: Sauvegarde ASIN (TEST - créer un scan fictif)
  console.log('💾 Phase 4 : Sauvegarde des ASIN\n');
  const testScan = await scanTracker.createScan({
    category: 'Bébé',
    subcategory: null,
    bsrRange: [1, 10000],
    priceRange: [1500, 5000],
    maxSellers: 5,
    excludeAmazon: true,
    page: 1,
    sortBy: 'current_SALES'
  });
  console.log(`   📝 Scan test créé: ID ${testScan.id}`);

  for (const product of products) {
    await scanTracker.saveAsin({
      ...product,
      category: 'Bébé',
      scanId: testScan.id
    });
    console.log(`   ✅ ${product.asin} sauvegardé`);
  }
  console.log('');

  // Phase 5: Groupement par marque
  console.log('🏷️  Phase 5 : Groupement par marque\n');
  const brandMap = {};

  products.forEach(p => {
    const brand = p.brand;
    if (!brandMap[brand]) {
      brandMap[brand] = {
        brand,
        category: 'Bébé',
        products: []
      };
    }
    brandMap[brand].products.push(p);
  });

  const brands = Object.values(brandMap);
  console.log(`   ✅ ${brands.length} marques trouvées:`);
  brands.forEach(b => {
    console.log(`      - ${b.brand}: ${b.products.length} produit(s)`);
  });
  console.log('');

  // Phase 6: Check FNAC
  console.log('🛒 Phase 6 : Vérification FNAC Pro\n');
  for (const brand of brands) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('brand', `%${brand.brand}%`);

      if (error) throw error;

      brand.nbProductsFNAC = data?.length || 0;
      brand.fnacProducts = data || [];

      console.log(`   ${brand.brand} - ${brand.nbProductsFNAC} produit(s) FNAC ${brand.nbProductsFNAC > 0 ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ❌ ${brand.brand} - Erreur FNAC: ${error.message}`);
      brand.nbProductsFNAC = 0;
      brand.fnacProducts = [];
    }
  }
  console.log('');

  // Phase 7: Calcul scores
  console.log('📊 Phase 7 : Calcul scores de priorité\n');
  for (const brand of brands) {
    const avgBSR = brand.products.reduce((sum, p) => sum + p.bsr, 0) / brand.products.length;
    const minBSR = Math.min(...brand.products.map(p => p.bsr));
    const avgPriceAmazon = brand.products.reduce((sum, p) => sum + p.price, 0) / brand.products.length;

    // Calcul score simplifié (0-100)
    let score = 0;
    if (minBSR < 1000) score += 40;
    else if (minBSR < 5000) score += 30;
    else if (minBSR < 10000) score += 20;

    if (brand.nbProductsFNAC > 0) score += 30;
    if (avgPriceAmazon > 25) score += 20;
    if (brand.products.length > 1) score += 10;

    brand.priorityScore = Math.min(score, 100);
    brand.avgBSR = Math.round(avgBSR);
    brand.minBSR = minBSR;
    brand.avgPriceAmazon = avgPriceAmazon.toFixed(2);

    console.log(`   ${brand.brand} - Score: ${brand.priorityScore}/100`);
  }
  console.log('');

  // Phase 8: Sauvegarde marques
  console.log('💾 Phase 8 : Sauvegarde des marques\n');
  for (const brand of brands) {
    await scanTracker.saveBrand({
      brand: brand.brand,
      scanId: testScan.id,
      nbProductsAmazon: brand.products.length,
      avgBSR: brand.avgBSR,
      minBSR: brand.minBSR,
      maxBSR: Math.max(...brand.products.map(p => p.bsr)),
      avgPriceAmazon: parseFloat(brand.avgPriceAmazon),
      category: brand.category,
      exampleAsin: brand.products[0].asin,
      isRestricted: brand.products.some(p => p.isRestricted),
      restrictionType: brand.products.find(p => p.isRestricted)?.restrictionType || null,
      restrictionReason: null,
      nbProductsFNAC: brand.nbProductsFNAC,
      avgPriceFNAC: null,
      avgMargin: null,
      estimatedMonthlySales: null,
      estimatedMonthlyProfit: null,
      unlockingCost: null,
      roiPercentage: null,
      paybackDays: null,
      priorityScore: brand.priorityScore
    });
    console.log(`   ✅ ${brand.brand} sauvegardé`);
  }
  console.log('');

  // Mettre à jour le scan
  await scanTracker.updateScan(testScan.id, {
    asinsFound: fakeProducts.length,
    asinsAfterHazmat: products.length,
    brandsFound: brands.length,
    brandsRestricted: brands.filter(b => b.products.some(p => p.isRestricted)).length,
    brandsWithFNAC: brands.filter(b => b.nbProductsFNAC > 0).length,
    tokensUsed: 0,
    tokensRemaining: null,
    durationSeconds: 0
  });

  console.log('========================================');
  console.log('  ✅ TEST TERMINE');
  console.log('========================================\n');
  console.log(`📊 Résultats:`);
  console.log(`   - ASIN de départ: ${testAsins.length}`);
  console.log(`   - ASIN finaux: ${products.length}`);
  console.log(`   - Marques: ${brands.length}`);
  console.log(`   - Avec FNAC: ${brands.filter(b => b.nbProductsFNAC > 0).length}`);
  console.log(`   - Scan ID: ${testScan.id}`);
  console.log('');
  console.log('Dashboard: http://localhost:3000/pages/ungating.html');
  console.log('');
}

// Lancer le test
testAllPhases()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  });