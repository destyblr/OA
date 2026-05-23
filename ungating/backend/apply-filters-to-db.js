#!/usr/bin/env node
/**
 * Applique les nouveaux filtres (Hazmat + PL) sur la base existante
 * Sans faire de nouveau scan Keepa
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const supabase = require('./config/supabase');
const fs = require('fs');
const path = require('path');

// Charger la blacklist PL
let PRIVATE_LABEL_BRANDS = [];
try {
  const blacklistPath = path.join(__dirname, 'config/private-label-blacklist.json');
  const blacklistData = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
  PRIVATE_LABEL_BRANDS = blacklistData.brands.filter(b => !b.startsWith('_'));
  console.log(`📋 ${PRIVATE_LABEL_BRANDS.length} marques PL chargées`);
} catch (error) {
  console.warn('⚠️  Impossible de charger blacklist PL');
  PRIVATE_LABEL_BRANDS = [];
}

// Mots-clés Hazmat
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
  'microphone bluetooth', 'enceinte bluetooth',
  'speaker bluetooth', 'lampe led rechargeable',
  'guirlande led', 'éclairage led portable'
];

function isHazmat(title, brand) {
  const searchText = `${title} ${brand}`.toLowerCase();
  return HAZMAT_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));
}

function isPrivateLabel(brand) {
  return PRIVATE_LABEL_BRANDS.some(pl =>
    brand.toLowerCase() === pl.toLowerCase()
  );
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
    const blacklistPath = path.join(__dirname, 'config/private-label-blacklist.json');
    const blacklistData = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));

    if (!blacklistData.brands.includes(brand)) {
      blacklistData.brands.push(brand);
      fs.writeFileSync(blacklistPath, JSON.stringify(blacklistData, null, 2), 'utf8');
      console.log(`   🤖 AUTO-AJOUT à blacklist: ${brand}`);

      // Recharger la blacklist
      PRIVATE_LABEL_BRANDS = blacklistData.brands.filter(b => !b.startsWith('_'));
      return true;
    }
  } catch (error) {
    console.warn(`   ⚠️  Impossible d'ajouter ${brand} à la blacklist: ${error.message}`);
  }
  return false;
}

async function applyFilters() {
  console.log('🔄 Application des filtres sur la base existante\n');
  console.log('='.repeat(60));

  try {
    // 1. Récupérer tous les produits
    console.log('\n📦 Récupération des produits...');
    const { data: products, error: productsError } = await supabase
      .from('asin_details')
      .select('*');

    if (productsError) throw productsError;

    console.log(`   ${products.length} produits trouvés`);

    // 2. Identifier les produits à supprimer
    let hazmatCount = 0;
    let plCount = 0;
    let plChineseCount = 0;
    const asinsToDelete = [];

    for (const product of products) {
      const brandName = product.brand || '';
      const productHazmat = isHazmat(product.title || '', brandName);
      const productPL = isPrivateLabel(brandName);
      const productChinesePL = !productPL && isSuspiciousChineseBrand(brandName);

      if (productHazmat) {
        console.log(`   🔥 Hazmat: ${product.asin} - ${brandName} - ${product.title?.substring(0, 50)}...`);
        hazmatCount++;
        asinsToDelete.push(product.asin);
      } else if (productPL) {
        console.log(`   🏷️  PL (blacklist): ${product.asin} - ${brandName}`);
        plCount++;
        asinsToDelete.push(product.asin);
      } else if (productChinesePL) {
        console.log(`   🤖 PL chinois détecté: ${product.asin} - ${brandName} - ${product.title?.substring(0, 50)}...`);
        addToBlacklist(brandName); // Auto-ajout
        plChineseCount++;
        asinsToDelete.push(product.asin);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Résumé filtrage:`);
    console.log(`   - Hazmat détectés: ${hazmatCount}`);
    console.log(`   - Private Label (blacklist): ${plCount}`);
    console.log(`   - Private Label (auto-détecté): ${plChineseCount}`);
    console.log(`   - Total à supprimer: ${asinsToDelete.length}`);
    console.log(`   - Produits OK: ${products.length - asinsToDelete.length}`);

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Résumé filtrage:`);
    console.log(`   - Hazmat détectés: ${hazmatCount}`);
    console.log(`   - Private Label: ${plCount}`);
    console.log(`   - Total à supprimer: ${asinsToDelete.length}`);
    console.log(`   - Produits OK: ${products.length - asinsToDelete.length}`);

    if (asinsToDelete.length === 0) {
      console.log('\n✅ Aucun produit à supprimer!');
      return;
    }

    // 3. Supprimer les produits
    console.log('\n🗑️  Suppression des produits...');
    const { error: deleteError } = await supabase
      .from('asin_details')
      .delete()
      .in('asin', asinsToDelete);

    if (deleteError) throw deleteError;
    console.log(`   ✅ ${asinsToDelete.length} produits supprimés`);

    // 4. Recalculer les marques
    console.log('\n🔄 Recalcul des marques...');
    const { data: brands, error: brandsError } = await supabase
      .from('brand_opportunities')
      .select('brand, category');

    if (brandsError) throw brandsError;

    let updated = 0;
    let deleted = 0;

    for (const brand of brands) {
      const { data: asins, error: asinsError } = await supabase
        .from('asin_details')
        .select('*')
        .eq('brand', brand.brand)
        .eq('category', brand.category);

      if (asinsError) {
        console.log(`   ⚠️  Erreur ${brand.brand}: ${asinsError.message}`);
        continue;
      }

      // Si plus de produits → supprimer la marque
      if (!asins || asins.length === 0) {
        const { error: deleteError } = await supabase
          .from('brand_opportunities')
          .delete()
          .eq('brand', brand.brand)
          .eq('category', brand.category);

        if (!deleteError) {
          console.log(`   🗑️  ${brand.brand} - Marque supprimée (plus de produits)`);
          deleted++;
        }
        continue;
      }

      // Recalculer les métriques
      const avgBsr = asins.reduce((sum, a) => sum + (a.bsr || 0), 0) / asins.length;
      const minBsr = Math.min(...asins.map(a => a.bsr || 999999));
      const avgPrice = asins.reduce((sum, a) => sum + (a.price_amazon || 0), 0) / asins.length;
      const isRestricted = asins.some(a => a.is_restricted === true);
      const restrictionType = asins.find(a => a.is_restricted === true)?.restriction_type || null;

      const { error: updateError } = await supabase
        .from('brand_opportunities')
        .update({
          nb_products_amazon: asins.length,
          avg_bsr: Math.round(avgBsr),
          min_bsr: minBsr,
          avg_price_amazon: avgPrice,
          is_restricted: isRestricted,
          restriction_type: restrictionType
        })
        .eq('brand', brand.brand)
        .eq('category', brand.category);

      if (!updateError) {
        console.log(`   ✅ ${brand.brand} - ${asins.length} produits restants`);
        updated++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Mise à jour terminée!');
    console.log(`   - Produits supprimés: ${asinsToDelete.length} (${hazmatCount} Hazmat + ${plCount} PL blacklist + ${plChineseCount} PL auto-détecté)`);
    console.log(`   - Marques mises à jour: ${updated}`);
    console.log(`   - Marques supprimées: ${deleted}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

applyFilters();
