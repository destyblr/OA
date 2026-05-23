#!/usr/bin/env node
/**
 * Nettoie la base: supprime produits Amazon + trop de vendeurs
 * Sans refaire les scans (économise les tokens)
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const supabase = require('./config/supabase');

async function cleanAmazonAndSellers() {
  console.log('🧹 Nettoyage de la base\n');
  console.log('='.repeat(60));

  try {
    // 1. Supprimer ASIN avec Amazon présent
    console.log('\n🛒 Suppression des produits Amazon...');
    const { data: amazonAsins, error: amazonError } = await supabase
      .from('asin_details')
      .delete()
      .eq('amazon_present', true)
      .select();

    if (amazonError) {
      console.error('❌ Erreur Amazon:', amazonError.message);
    } else {
      console.log(`✅ ${amazonAsins?.length || 0} produits Amazon supprimés`);
    }

    // 2. Supprimer ASIN avec >5 vendeurs
    console.log('\n👥 Suppression des produits avec >5 vendeurs...');
    const { data: sellerAsins, error: sellerError } = await supabase
      .from('asin_details')
      .delete()
      .gt('seller_count', 5)
      .select();

    if (sellerError) {
      console.error('❌ Erreur vendeurs:', sellerError.message);
    } else {
      console.log(`✅ ${sellerAsins?.length || 0} produits (>5 vendeurs) supprimés`);
    }

    // 3. Récupérer toutes les marques
    console.log('\n🏷️  Recalcul des marques...');
    const { data: brands, error: brandsError } = await supabase
      .from('brand_opportunities')
      .select('brand, category');

    if (brandsError) throw brandsError;

    let updated = 0;
    let deleted = 0;

    // 4. Pour chaque marque, vérifier s'il reste des produits
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
          console.log(`   🗑️  ${brand.brand} - Supprimé (plus de produits)`);
          deleted++;
        }
        continue;
      }

      // Recalculer les métriques
      const avgBsr = asins.reduce((sum, a) => sum + (a.bsr || 0), 0) / asins.length;
      const minBsr = Math.min(...asins.map(a => a.bsr || 999999));
      const avgPrice = asins.reduce((sum, a) => sum + (a.price_amazon || 0), 0) / asins.length;

      const { error: updateError } = await supabase
        .from('brand_opportunities')
        .update({
          nb_products_amazon: asins.length,
          avg_bsr: Math.round(avgBsr),
          min_bsr: minBsr,
          avg_price_amazon: avgPrice
        })
        .eq('brand', brand.brand)
        .eq('category', brand.category);

      if (!updateError) {
        console.log(`   ✅ ${brand.brand} - ${asins.length} produits restants`);
        updated++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Nettoyage terminé!');
    console.log(`   - Marques mises à jour: ${updated}`);
    console.log(`   - Marques supprimées: ${deleted}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

cleanAmazonAndSellers();
