#!/usr/bin/env node
/**
 * Met à jour is_restricted pour toutes les marques
 * Basé sur les ASIN déjà scannés
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const supabase = require('./config/supabase');

async function updateBrandRestrictions() {
  console.log('🔄 Mise à jour des restrictions de marques\n');
  console.log('='.repeat(60));

  try {
    // 1. Récupérer toutes les marques
    const { data: brands, error: brandsError } = await supabase
      .from('brand_opportunities')
      .select('brand, category');

    if (brandsError) throw brandsError;

    console.log(`📦 ${brands.length} marques trouvées\n`);

    let updated = 0;
    let skipped = 0;

    // 2. Pour chaque marque, calculer isRestricted
    for (const brand of brands) {
      // Récupérer tous les ASIN de cette marque
      const { data: asins, error: asinsError } = await supabase
        .from('asin_details')
        .select('asin, brand, is_restricted, restriction_type')
        .eq('brand', brand.brand)
        .eq('category', brand.category);

      if (asinsError) {
        console.log(`   ⚠️  Erreur ${brand.brand}: ${asinsError.message}`);
        skipped++;
        continue;
      }

      if (!asins || asins.length === 0) {
        console.log(`   ⚠️  Pas d'ASIN pour ${brand.brand}`);
        skipped++;
        continue;
      }

      // Calculer isRestricted
      const isRestricted = asins.some(a => a.is_restricted === true);
      const restrictedAsin = asins.find(a => a.is_restricted === true);
      const restrictionType = restrictedAsin?.restriction_type || null;

      // Mettre à jour la marque
      const { error: updateError } = await supabase
        .from('brand_opportunities')
        .update({
          is_restricted: isRestricted,
          restriction_type: restrictionType
        })
        .eq('brand', brand.brand)
        .eq('category', brand.category);

      if (updateError) {
        console.log(`   ❌ Erreur update ${brand.brand}: ${updateError.message}`);
        skipped++;
      } else {
        console.log(`   ${isRestricted ? '🔒' : '✅'} ${brand.brand} - ${isRestricted ? 'Restreint' : 'Non restreint'} (${asins.length} produits)`);
        updated++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Mise à jour terminée!`);
    console.log(`   - Mises à jour: ${updated}`);
    console.log(`   - Ignorées: ${skipped}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

updateBrandRestrictions();
