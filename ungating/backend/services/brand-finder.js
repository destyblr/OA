const keepaAPI = require('./keepa-api');
const spAPI = require('./sp-api');
const scanTracker = require('./scan-tracker');
const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

/**
 * Plan de rotation sur 32 jours
 */
const ROTATION_PLAN = [
  // Baby Products (8 configurations)
  { category: 'Baby', bsrRange: [0, 20000], page: 1 },
  { category: 'Baby', bsrRange: [0, 20000], page: 2 },
  { category: 'Baby', bsrRange: [0, 30000], page: 1 },
  { category: 'Baby', bsrRange: [20000, 50000], page: 1 },

  // Pet Supplies (8 configurations)
  { category: 'Pet', bsrRange: [0, 20000], page: 1 },
  { category: 'Pet', bsrRange: [0, 20000], page: 2 },
  { category: 'Pet', bsrRange: [0, 30000], page: 1 },
  { category: 'Pet', bsrRange: [20000, 50000], page: 1 },

  // Beauty (8 configurations)
  { category: 'Beauty', bsrRange: [0, 25000], page: 1 },
  { category: 'Beauty', bsrRange: [0, 25000], page: 2 },
  { category: 'Beauty', bsrRange: [0, 35000], page: 1 },
  { category: 'Beauty', bsrRange: [20000, 50000], page: 1 },

  // Grocery (8 configurations)
  { category: 'Grocery', bsrRange: [0, 20000], page: 1 },
  { category: 'Grocery', bsrRange: [0, 20000], page: 2 },
  { category: 'Grocery', bsrRange: [0, 30000], page: 1 },
  { category: 'Grocery', bsrRange: [20000, 50000], page: 1 }
];

/**
 * Mots-clés Hazmat pour filtrage rapide
 */
const HAZMAT_KEYWORDS = [
  // Produits chimiques/liquides
  'spray', 'aerosol', 'aérosol',
  'liquide', 'liquid',
  'parfum', 'perfume', 'fragrance',
  'vernis', 'nail polish',
  'flammable', 'inflammable',
  'alcohol', 'alcool',
  'cleaning', 'nettoyant',
  'colle', 'glue', 'adhesive',

  // Batteries (direct)
  'battery', 'batterie', 'lithium', 'pile',
  'rechargeable', 'power bank',

  // Catégories à risque (souvent batteries cachées)
  // ATTENTION: Peut créer des faux positifs
  'microphone bluetooth', 'enceinte bluetooth',
  'speaker bluetooth', 'lampe led rechargeable',
  'guirlande led', 'éclairage led portable'
];

/**
 * Marques Private Label (chargées depuis JSON configurable)
 */
let PRIVATE_LABEL_BRANDS = [];
const BLACKLIST_PATH = path.join(__dirname, '../config/private-label-blacklist.json');

function loadBlacklist() {
  try {
    const blacklistData = JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));
    PRIVATE_LABEL_BRANDS = blacklistData.brands.filter(b => !b.startsWith('_'));
    console.log(`📋 ${PRIVATE_LABEL_BRANDS.length} marques PL chargées depuis blacklist`);
  } catch (error) {
    console.warn('⚠️  Impossible de charger private-label-blacklist.json');
    PRIVATE_LABEL_BRANDS = [
      'Amazon Basics', 'Amazon Essentials', 'Amazon Collection',
      'Solimo', 'Presto!', 'Happy Belly', 'Mama Bear',
      'Amazon Commercial', 'Goodthreads', 'Daily Ritual',
      'Core 10', 'Iris & Lilly', 'find.', 'Truth & Fable', 'Meraki'
    ];
  }
}

/**
 * Détecter si une marque ressemble à du PL chinois typique
 */
function isSuspiciousChineseBrand(brand) {
  if (!brand || brand.length < 4) return false;

  // Ignorer marques avec espaces (noms composés légitimes)
  if (brand.includes(' ')) return false;

  const upper = brand.toUpperCase();

  // Whitelist: marques connues légitimes qui pourraient matcher les patterns
  const knownLegit = ['LEGO', 'NERF', 'HASBRO', 'FISHER', 'PRICE'];
  if (knownLegit.some(w => upper.includes(w))) return false;

  // Pattern 1: Consonnes rares typiques PL chinois (Y, Z, W, Q, X en début)
  const rareConsonants = ['Y', 'Z', 'W', 'Q', 'X'];
  const startsWithRare = rareConsonants.some(c => upper.startsWith(c));

  // Pattern 2: Ratio voyelles/consonnes suspect
  const vowels = (upper.match(/[AEIOU]/g) || []).length;
  const letters = (upper.match(/[A-Z]/g) || []).length;
  const vowelRatio = vowels / letters;

  // Pattern 3: Consonnes multiples au début (Mtsooning, Jradse)
  const startsWithMultipleConsonants = /^[BCDFGHJKLMNPQRSTVWXYZ]{3,}/.test(upper);

  // Pattern 4: Nom incompréhensible (consonnes groupées bizarres)
  const hasWeirdPattern = /[BCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(upper) || // 4+ consonnes consécutives
                          /[QX][^UAEIOU]/.test(upper) || // Q/X pas suivi de voyelle
                          /TSN|KQG|NTSN|DSE/.test(upper); // Séquences improbables

  // Pattern 5: Tout en majuscules, court, peu de voyelles
  const allCaps = brand === upper && brand.length >= 5 && brand.length <= 10;
  const commonWords = ['TECH', 'SHOP', 'PLAY', 'TOYS', 'BABY', 'KIDS', 'HOME', 'PRO', 'MAX', 'PLUS', 'STAR'];
  const hasCommonWord = commonWords.some(w => upper.includes(w));

  // Détection ultra-agressive pour noms incompréhensibles
  if (startsWithRare && vowelRatio < 0.4) return true; // YANJINGHE, WYRIAZA, XSHOT
  if (hasWeirdPattern) return true; // Dhqkqg, Mtsooning
  if (startsWithMultipleConsonants && vowelRatio < 0.35) return true; // Jradse
  if (allCaps && !hasCommonWord && vowelRatio < 0.4) return true; // AUYAO, PATIFEED, ANSTEN
  if (allCaps && brand.length <= 7 && vowelRatio < 0.45) return true; // Kekeso

  return false;
}

/**
 * Ajouter une marque PL à la blacklist automatiquement
 */
function addToBlacklist(brand) {
  try {
    const blacklistData = JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));

    if (!blacklistData.brands.includes(brand)) {
      blacklistData.brands.push(brand);
      fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(blacklistData, null, 2), 'utf8');
      console.log(`   🤖 AUTO-AJOUT à blacklist: ${brand}`);
      loadBlacklist(); // Recharger
      return true;
    }
  } catch (error) {
    console.warn(`   ⚠️  Impossible d'ajouter ${brand} à la blacklist: ${error.message}`);
  }
  return false;
}

loadBlacklist();

/**
 * Service principal pour trouver des marques rentables
 */
class BrandFinder {
  /**
   * Scanner automatiquement avec rotation
   */
  async runDailyScan() {
    const startTime = Date.now();

    // Récupérer la configuration du jour (rotation)
    const dayIndex = new Date().getDate() % ROTATION_PLAN.length;
    const config = ROTATION_PLAN[dayIndex];

    console.log(`\n🚀 DAILY BRAND SCAN - Jour ${dayIndex + 1}/${ROTATION_PLAN.length}`);
    console.log(`📦 Catégorie: ${config.category} | BSR: ${config.bsrRange[0]}-${config.bsrRange[1]} | Page: ${config.page}\n`);

    // Créer l'entrée dans l'historique
    const scan = await scanTracker.createScan({
      category: config.category,
      bsrRange: config.bsrRange,
      priceRange: [1500, 5000],
      maxSellers: 5,
      excludeAmazon: true,
      page: config.page,
      sortBy: 'current_SALES'
    });

    try {
      // Étape 1 : Keepa Product Finder
      console.log('🔍 Étape 1 : Keepa Product Finder\n');
      const keepaResult = await keepaAPI.productFinder({
        category: config.category,
        bsrRange: config.bsrRange,
        priceRange: [1500, 5000],
        minRating: 400,
        maxSellers: 5,
        excludeAmazon: true,
        page: config.page,
        perPage: 100
      });

      let products = keepaResult.products;
      console.log(`   ✅ ${products.length} ASIN trouvés\n`);

      // Étape 2 : Filtrer Hazmat (mots-clés)
      console.log('⚠️  Étape 2 : Filtre Hazmat (mots-clés)\n');
      products = products.filter(p => {
        const isHazmat = HAZMAT_KEYWORDS.some(kw =>
          (p.title || '').toLowerCase().includes(kw)
        );

        if (isHazmat) {
          console.log(`   ⚠️  SKIP ${p.asin} : Hazmat détecté (${p.title.substring(0, 50)}...)`);
        }

        return !isHazmat;
      });

      console.log(`   ✅ ${products.length} ASIN après filtre Hazmat\n`);

      // Étape 2b : Filtrer Private Labels Amazon
      console.log('🏷️  Étape 2b : Filtre Private Labels Amazon\n');
      products = products.filter(p => {
        const isPrivateLabel = PRIVATE_LABEL_BRANDS.some(brand =>
          (p.brand || '').toLowerCase().includes(brand.toLowerCase())
        );

        if (isPrivateLabel) {
          console.log(`   ❌ SKIP ${p.asin} : Private Label Amazon (${p.brand})`);
        }

        return !isPrivateLabel;
      });

      console.log(`   ✅ ${products.length} ASIN après filtre Private Label\n`);

      // Étape 2c : Filtrer Amazon présent (filtres Keepa ne marchent pas pour FR)
      console.log('🛒 Étape 2c : Filtre Amazon présent\n');
      products = products.filter(p => {
        if (p.amazonPresent) {
          console.log(`   ❌ SKIP ${p.asin} : Amazon est vendeur`);
        }
        return !p.amazonPresent;
      });

      console.log(`   ✅ ${products.length} ASIN après filtre Amazon\n`);

      // Étape 2d : Filtrer vendeurs >5 (filtres Keepa ne marchent pas pour FR)
      console.log('👥 Étape 2d : Filtre vendeurs (max 5)\n');
      products = products.filter(p => {
        const tooManySellers = p.sellerCount > 5;
        if (tooManySellers) {
          console.log(`   ❌ SKIP ${p.asin} : Trop de vendeurs (${p.sellerCount})`);
        }
        return !tooManySellers;
      });

      console.log(`   ✅ ${products.length} ASIN après filtre vendeurs\n`);

      // Étape 3 : SP-API - Récupérer infos détaillées
      console.log('📦 Étape 3 : SP-API - Infos produits\n');
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        console.log(`   [${i+1}/${products.length}] ${p.asin}`);

        // Infos produit
        const catalogInfo = await spAPI.getCatalogItem(p.asin);
        if (catalogInfo) {
          p.brand = catalogInfo.brand;
          p.title = catalogInfo.title;
          p.category = catalogInfo.category;
          p.imageUrl = catalogInfo.imageUrl;
        }

        // Check restriction
        const restriction = await spAPI.checkRestriction(p.asin);
        if (restriction) {
          p.isRestricted = restriction.isRestricted;
          p.restrictionType = restriction.type;
          p.restrictionReasons = restriction.reasons;
        }

        // Sauvegarder l'ASIN
        await scanTracker.saveAsin({
          asin: p.asin,
          brand: p.brand,
          title: p.title,
          category: p.category,
          bsr: p.salesRank,
          price: p.price,
          rating: p.rating,
          reviewCount: p.reviewCount,
          sellerCount: p.sellerCount,
          amazonPresent: p.amazonPresent,
          isRestricted: p.isRestricted,
          restrictionType: p.restrictionType,
          imageUrl: p.imageUrl
        }, scan.id);
      }

      console.log(`\n   ✅ ${products.length} ASIN analysés\n`);

      // Étape 4 : Grouper par marque
      console.log('🏷️  Étape 4 : Groupement par marque\n');
      const brandGroups = this.groupByBrand(products);
      const brands = Object.entries(brandGroups)
        .filter(([brand, prods]) => prods.length >= 3) // Min 3 produits
        .map(([brand, prods]) => ({
          brand,
          products: prods,
          nbProducts: prods.length,
          avgBSR: Math.round(prods.reduce((sum, p) => sum + (p.salesRank || 0), 0) / prods.length),
          minBSR: Math.min(...prods.map(p => p.salesRank || 999999)),
          maxBSR: Math.max(...prods.map(p => p.salesRank || 0)),
          avgPrice: prods.reduce((sum, p) => sum + (p.price || 0), 0) / prods.length,
          isRestricted: prods.some(p => p.isRestricted),
          restrictionType: prods.find(p => p.isRestricted)?.restrictionType || null,
          exampleAsin: prods[0].asin,
          category: prods[0].category
        }));

      console.log(`   ✅ ${brands.length} marques avec ≥3 produits\n`);

      // Étape 5 : Check disponibilité FNAC
      console.log('🛒 Étape 5 : Check FNAC\n');
      for (const brand of brands) {
        const { data: fnacProducts } = await supabase
          .from('products')
          .select('*')
          .ilike('brand', `%${brand.brand}%`);

        brand.nbProductsFNAC = fnacProducts?.length || 0;
        brand.avgPriceFNAC = fnacProducts?.length > 0
          ? fnacProducts.reduce((sum, p) => sum + p.price, 0) / fnacProducts.length
          : 0;

        console.log(`   ${brand.brand}: ${brand.nbProductsFNAC} produits FNAC`);
      }

      console.log(`\n   ✅ ${brands.filter(b => b.nbProductsFNAC > 0).length} marques avec produits FNAC\n`);

      // Étape 6 : Calculer rentabilité et score
      console.log('💰 Étape 6 : Calcul rentabilité\n');
      for (const brand of brands) {
        // Marge moyenne
        if (brand.nbProductsFNAC > 0) {
          const fees = brand.avgPrice * 0.30; // 30% frais Amazon (estimation)
          brand.avgMargin = brand.avgPrice - brand.avgPriceFNAC - fees;
        } else {
          brand.avgMargin = 0;
        }

        // Ventes mensuelles estimées (basé sur BSR)
        brand.estimatedMonthlySales = this.estimateMonthlySales(brand.avgBSR);
        brand.estimatedMonthlyProfit = brand.avgMargin * brand.estimatedMonthlySales;

        // Coût de déblocage (estimation)
        brand.unlockingCost = brand.restrictionType === 'CATEGORY' ? 50 : 200;

        // ROI et payback
        brand.roiPercentage = brand.avgMargin > 0 ? (brand.avgMargin / brand.avgPriceFNAC) * 100 : 0;
        brand.paybackDays = brand.estimatedMonthlyProfit > 0
          ? Math.round((brand.unlockingCost / brand.estimatedMonthlyProfit) * 30)
          : 999;

        // Score de priorité (0-100)
        brand.priorityScore = this.calculatePriorityScore(brand);

        // Sauvegarder la marque
        await scanTracker.saveBrand(brand, scan.id);

        console.log(`   ${brand.brand}: Score ${brand.priorityScore}/100`);
      }

      console.log(`\n   ✅ ${brands.length} marques sauvegardées\n`);

      // Étape 7 : Mettre à jour l'historique du scan
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const tokensInfo = await keepaAPI.getTokensLeft();

      await scanTracker.updateScan(scan.id, {
        asinsFound: keepaResult.products.length,
        asinsAfterHazmat: products.length,
        brandsFound: brands.length,
        brandsRestricted: brands.filter(b => b.isRestricted).length,
        brandsWithFNAC: brands.filter(b => b.nbProductsFNAC > 0).length,
        tokensUsed: keepaResult.tokensUsed,
        tokensRemaining: tokensInfo.tokensLeft,
        durationSeconds
      });

      console.log(`\n🎉 SCAN TERMINÉ`);
      console.log(`   Durée: ${durationSeconds}s`);
      console.log(`   ASIN: ${products.length}`);
      console.log(`   Marques: ${brands.length}`);
      console.log(`   Tokens restants: ${tokensInfo.tokensLeft}\n`);

      return {
        success: true,
        scanId: scan.id,
        summary: {
          asins: products.length,
          brands: brands.length,
          brandsWithFNAC: brands.filter(b => b.nbProductsFNAC > 0).length,
          durationSeconds,
          tokensUsed: keepaResult.tokensUsed,
          tokensRemaining: tokensInfo.tokensLeft
        }
      };
    } catch (error) {
      console.error(`\n❌ ERREUR SCAN: ${error.message}\n`);
      await scanTracker.markScanError(scan.id, error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Grouper les produits par marque
   */
  groupByBrand(products) {
    const groups = {};

    for (const product of products) {
      const brand = product.brand || 'Unknown';
      if (!groups[brand]) {
        groups[brand] = [];
      }
      groups[brand].push(product);
    }

    return groups;
  }

  /**
   * Estimer les ventes mensuelles basé sur BSR
   */
  estimateMonthlySales(bsr) {
    if (bsr < 1000) return 500;
    if (bsr < 5000) return 200;
    if (bsr < 10000) return 100;
    if (bsr < 20000) return 50;
    if (bsr < 30000) return 20;
    if (bsr < 50000) return 10;
    return 5;
  }

  /**
   * Calculer le score de priorité (0-100)
   */
  calculatePriorityScore(brand) {
    let score = 0;

    // BSR (40 points max)
    if (brand.avgBSR < 10000) score += 40;
    else if (brand.avgBSR < 20000) score += 30;
    else if (brand.avgBSR < 30000) score += 20;
    else score += 10;

    // FNAC disponible (30 points max)
    if (brand.nbProductsFNAC > 10) score += 30;
    else if (brand.nbProductsFNAC > 5) score += 20;
    else if (brand.nbProductsFNAC > 0) score += 10;

    // ROI (20 points max)
    if (brand.roiPercentage > 60) score += 20;
    else if (brand.roiPercentage > 40) score += 15;
    else if (brand.roiPercentage > 20) score += 10;

    // Payback rapide (10 points max)
    if (brand.paybackDays < 7) score += 10;
    else if (brand.paybackDays < 30) score += 5;

    // Pénalité si prix Amazon manquant ou invalide (-20 points)
    const avgPrice = brand.avgPriceAmazon || brand.avgPrice;
    if (!avgPrice || avgPrice <= 0) {
      score -= 20;
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Scanner avec une configuration spécifique
   */
  async runScanWithConfig(rotation) {
    const startTime = Date.now();

    console.log(`\n🚀 SCAN MANUEL - ${rotation.name}`);
    console.log(`📦 Catégorie: ${rotation.category} | BSR: ${rotation.bsrMin}-${rotation.bsrMax} | Prix: ${rotation.priceMin}-${rotation.priceMax}€\n`);

    // Créer l'entrée dans l'historique
    const scan = await scanTracker.createScan({
      category: rotation.category,
      bsrRange: [rotation.bsrMin, rotation.bsrMax],
      priceRange: [rotation.priceMin * 100, rotation.priceMax * 100],
      maxSellers: rotation.maxSellers,
      excludeAmazon: true,
      page: 1,
      sortBy: 'current_SALES'
    });

    try {
      // Étape 1 : Keepa Product Finder
      console.log('🔍 Étape 1 : Keepa Product Finder\n');
      const keepaResult = await keepaAPI.productFinder({
        category: rotation.category,
        bsrRange: [rotation.bsrMin, rotation.bsrMax],
        priceRange: [rotation.priceMin * 100, rotation.priceMax * 100],
        minRating: 400,
        maxSellers: rotation.maxSellers,
        excludeAmazon: true,
        page: 1,
        perPage: rotation.tokensPerScan
      });

      let products = keepaResult.products;
      console.log(`   ✅ ${products.length} ASIN trouvés\n`);

      // Étape 2 : Filtrer Hazmat (mots-clés)
      console.log('⚠️  Étape 2 : Filtre Hazmat (mots-clés)\n');
      products = products.filter(p => {
        const isHazmat = HAZMAT_KEYWORDS.some(kw =>
          (p.title || '').toLowerCase().includes(kw)
        );

        if (isHazmat) {
          console.log(`   ❌ HAZMAT détecté: ${p.title.substring(0, 50)}...`);
        }

        return !isHazmat;
      });
      console.log(`   ✅ ${products.length} ASIN après filtre Hazmat\n`);

      // Étape 2b : Filtrer Private Labels (Amazon + détection auto chinois)
      console.log('🏷️  Étape 2b : Filtre Private Labels (Amazon + Auto-détection)\n');
      products = products.filter(p => {
        const brandName = p.brand || '';

        // Check blacklist existante
        const isPrivateLabel = PRIVATE_LABEL_BRANDS.some(brand =>
          brandName.toLowerCase().includes(brand.toLowerCase())
        );

        if (isPrivateLabel) {
          console.log(`   ❌ PL (blacklist): ${brandName} - ${p.title.substring(0, 50)}...`);
          return false;
        }

        // Détection automatique marques chinoises suspectes
        if (isSuspiciousChineseBrand(brandName)) {
          console.log(`   🤖 PL chinois détecté: ${brandName} - ${p.title.substring(0, 50)}...`);
          addToBlacklist(brandName); // Ajout auto à la blacklist
          return false;
        }

        return true;
      });
      console.log(`   ✅ ${products.length} ASIN après filtre Private Label\n`);

      // Étape 2c : Filtre Amazon présent (double sécurité Keepa)
      console.log('🛒 Étape 2c : Filtre Amazon présent\n');
      products = products.filter(p => {
        if (p.amazonPresent) {
          console.log(`   ❌ SKIP ${p.asin} : Amazon est vendeur`);
        }
        return !p.amazonPresent;
      });
      console.log(`   ✅ ${products.length} ASIN après filtre Amazon\n`);

      // Étape 2d : Filtre vendeurs (max 5) (double sécurité Keepa)
      console.log('👥 Étape 2d : Filtre vendeurs (max 5)\n');
      products = products.filter(p => {
        const tooManySellers = p.sellerCount > 5;
        if (tooManySellers) {
          console.log(`   ❌ SKIP ${p.asin} : Trop de vendeurs (${p.sellerCount})`);
        }
        return !tooManySellers;
      });
      console.log(`   ✅ ${products.length} ASIN après filtre vendeurs\n`);

      // Étape 3 : Vérifier restrictions via SP-API (Hazmat désactivé - pas de permissions)
      console.log('🔐 Étape 3 : Vérification SP-API (restrictions uniquement)\n');
      for (const product of products) {
        try {
          const restrictionStatus = await spAPI.checkRestriction(product.asin);

          product.isRestricted = restrictionStatus.isRestricted;
          product.restrictionType = restrictionStatus.type;
          product.isHazmat = false; // Hazmat déjà filtré par mots-clés

          console.log(`   ${product.asin} - Restreint: ${product.isRestricted ? '🔒' : '✅'}`);
        } catch (error) {
          console.log(`   ❌ ${product.asin} - Erreur SP-API: ${error.message}`);
          product.isRestricted = false;
          product.restrictionType = null;
          product.isHazmat = false;
        }
      }
      console.log(`   ✅ ${products.length} ASIN après vérification SP-API\n`);

      // Étape 4 : Sauvegarder les ASIN
      console.log('💾 Étape 4 : Sauvegarde des ASIN\n');
      for (const product of products) {
        await scanTracker.saveAsin({
          ...product,
          category: rotation.category,
          scanId: scan.id
        });
      }

      // Étape 5 : Grouper par marque
      console.log('🏷️  Étape 5 : Groupement par marque\n');
      const brandMap = {};

      products.forEach(p => {
        const brand = p.brand;
        if (!brandMap[brand]) {
          brandMap[brand] = {
            brand,
            category: rotation.category,
            products: []
          };
        }
        brandMap[brand].products.push(p);
      });

      const brands = Object.values(brandMap);
      console.log(`   ✅ ${brands.length} marques uniques trouvées\n`);

      // Étape 6 : Checker FNAC + Calculer scores
      console.log('🔍 Étape 6 : Vérification FNAC + Calcul scores\n');
      for (const brand of brands) {
        // Checker produits FNAC
        const { data: fnacProducts } = await supabase
          .from('products')
          .select('*')
          .ilike('brand', `%${brand.brand}%`)
          .limit(10);

        brand.fnacProducts = fnacProducts || [];
        brand.nbProductsFnac = fnacProducts?.length || 0;

        if (brand.nbProductsFnac > 0) {
          brand.avgPriceFnac = fnacProducts.reduce((sum, p) => sum + (p.price || 0), 0) / fnacProducts.length;
        }

        // Calculer métriques
        brand.nbProductsAmazon = brand.products.length;
        brand.avgBsr = brand.products.reduce((sum, p) => sum + p.bsr, 0) / brand.products.length;
        brand.minBsr = Math.min(...brand.products.map(p => p.bsr));
        brand.avgPriceAmazon = brand.products.reduce((sum, p) => sum + p.price, 0) / brand.products.length;

        // Restriction et type
        brand.isRestricted = brand.products.some(p => p.isRestricted);
        brand.restrictionType = brand.products.find(p => p.isRestricted)?.restrictionType || null;
        brand.exampleAsin = brand.products[0].asin;

        // ROI estimation (simplifié)
        if (brand.nbProductsFnac > 0 && brand.avgPriceFnac) {
          const margin = brand.avgPriceAmazon - brand.avgPriceFnac;
          brand.roiPercentage = (margin / brand.avgPriceFnac) * 100;
          brand.estimatedMonthlyProfit = margin * 30; // Estimation simpliste
          brand.paybackDays = brand.avgPriceFnac / margin;
        }

        // Calculer score de priorité
        brand.priorityScore = this.calculatePriorityScore(brand);

        // Sauvegarder en BDD
        await scanTracker.saveBrand(brand);

        console.log(`   ✅ ${brand.brand} - Score: ${brand.priorityScore}/100 | BSR: ${Math.round(brand.avgBsr)} | FNAC: ${brand.nbProductsFnac} produits`);
      }

      // Mise à jour du scan
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await scanTracker.updateScan(scan.id, {
        status: 'completed',
        asinsFound: products.length,
        brandsFound: brands.length,
        brandsWithFnac: brands.filter(b => b.nbProductsFnac > 0).length,
        tokensUsed: rotation.tokensPerScan,
        durationSeconds: duration
      });

      console.log(`\n✅ SCAN TERMINÉ en ${duration}s`);
      console.log(`📊 ${products.length} ASIN | ${brands.length} marques | ${brands.filter(b => b.nbProductsFnac > 0).length} avec FNAC\n`);

      return {
        scanId: scan.id,
        summary: {
          asinsFound: products.length,
          brandsFound: brands.length,
          brandsWithFnac: brands.filter(b => b.nbProductsFnac > 0).length,
          tokensUsed: rotation.tokensPerScan,
          duration
        }
      };

    } catch (error) {
      console.error(`❌ Erreur scan:`, error);
      await scanTracker.markScanError(scan.id, error.message);
      throw error;
    }
  }
}

module.exports = BrandFinder;
