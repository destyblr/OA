#!/usr/bin/env node
/**
 * Analyse les ASIN récents pour identifier les opportunités
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const supabase = require('./config/supabase');

async function analyzeRecentAsins() {
  console.log('🔍 ANALYSE DES ASIN RÉCENTS\n');
  console.log('='.repeat(70));

  try {
    // Charger les ASIN récents
    const { data: asins, error } = await supabase
      .from('asin_details')
      .select('*')
      .order('first_seen', { ascending: false })
      .limit(100);

    if (error) throw error;

    console.log(`📦 Total ASIN analysés: ${asins.length}\n`);

    // Statistiques générales
    const stats = {
      total: asins.length,
      restricted: asins.filter(a => a.is_restricted).length,
      nonRestricted: asins.filter(a => !a.is_restricted).length,
      withAmazon: asins.filter(a => a.amazon_present).length,
      withoutAmazon: asins.filter(a => !a.amazon_present).length,
      avgBsr: Math.round(asins.reduce((sum, a) => sum + (a.bsr || 0), 0) / asins.length),
      avgPrice: (asins.reduce((sum, a) => sum + (a.price_amazon || 0), 0) / asins.length).toFixed(2),
      avgSellers: Math.round(asins.reduce((sum, a) => sum + (a.seller_count || 0), 0) / asins.length)
    };

    console.log('📊 STATISTIQUES GLOBALES:');
    console.log('='.repeat(70));
    console.log(`   Restreints: ${stats.restricted} (${(stats.restricted/stats.total*100).toFixed(1)}%)`);
    console.log(`   Non restreints: ${stats.nonRestricted} (${(stats.nonRestricted/stats.total*100).toFixed(1)}%)`);
    console.log(`   Avec Amazon: ${stats.withAmazon} (${(stats.withAmazon/stats.total*100).toFixed(1)}%)`);
    console.log(`   Sans Amazon: ${stats.withoutAmazon} (${(stats.withoutAmazon/stats.total*100).toFixed(1)}%)`);
    console.log(`   BSR moyen: ${stats.avgBsr.toLocaleString()}`);
    console.log(`   Prix moyen: ${stats.avgPrice}€`);
    console.log(`   Vendeurs moyens: ${stats.avgSellers}`);

    // Catégories
    console.log('\n📂 RÉPARTITION PAR CATÉGORIE:');
    console.log('='.repeat(70));
    const categories = {};
    asins.forEach(a => {
      const cat = a.category || 'Unknown';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat]++;
    });
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat.padEnd(20)}: ${count} (${(count/stats.total*100).toFixed(1)}%)`);
      });

    // Top marques
    console.log('\n🏷️  TOP 10 MARQUES:');
    console.log('='.repeat(70));
    const brands = {};
    asins.forEach(a => {
      const brand = a.brand || 'Unknown';
      if (!brands[brand]) brands[brand] = { count: 0, restricted: 0, avgBsr: [] };
      brands[brand].count++;
      if (a.is_restricted) brands[brand].restricted++;
      if (a.bsr) brands[brand].avgBsr.push(a.bsr);
    });
    Object.entries(brands)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .forEach(([brand, data]) => {
        const avgBsr = data.avgBsr.length > 0
          ? Math.round(data.avgBsr.reduce((a,b) => a+b, 0) / data.avgBsr.length)
          : 0;
        const restrictedPct = (data.restricted / data.count * 100).toFixed(0);
        console.log(`   ${brand.substring(0, 25).padEnd(26)} | ${String(data.count).padStart(3)} produits | ${String(restrictedPct).padStart(3)}% restreints | BSR moy: ${avgBsr.toLocaleString()}`);
      });

    // Opportunités (non restreint, sans Amazon, bon BSR)
    console.log('\n💎 TOP 10 OPPORTUNITÉS (non restreints, sans Amazon, BSR < 15000):');
    console.log('='.repeat(70));
    const opportunities = asins
      .filter(a => !a.is_restricted && !a.amazon_present && a.bsr && a.bsr < 15000)
      .sort((a, b) => a.bsr - b.bsr)
      .slice(0, 10);

    if (opportunities.length === 0) {
      console.log('   ❌ Aucune opportunité trouvée avec ces critères');
    } else {
      opportunities.forEach((a, i) => {
        console.log(`   ${i+1}. ${a.asin} | ${a.brand?.substring(0,20).padEnd(21)} | BSR: ${String(a.bsr).padStart(6)} | ${a.price_amazon?.toFixed(2)}€ | ${a.seller_count} vendeurs`);
      });
    }

    // Meilleurs BSR restreints (opportunités ungating)
    console.log('\n🔒 TOP 10 RESTREINTS AVEC MEILLEURS BSR (opportunités ungating):');
    console.log('='.repeat(70));
    const restrictedOpportunities = asins
      .filter(a => a.is_restricted && a.bsr && a.bsr < 20000)
      .sort((a, b) => a.bsr - b.bsr)
      .slice(0, 10);

    if (restrictedOpportunities.length === 0) {
      console.log('   ❌ Aucun produit restreint avec bon BSR');
    } else {
      restrictedOpportunities.forEach((a, i) => {
        console.log(`   ${i+1}. ${a.asin} | ${a.brand?.substring(0,20).padEnd(21)} | BSR: ${String(a.bsr).padStart(6)} | ${a.price_amazon?.toFixed(2)}€ | ${a.restriction_type}`);
      });
    }

    // Analyse des restrictions
    console.log('\n🔒 TYPES DE RESTRICTIONS:');
    console.log('='.repeat(70));
    const restrictions = {};
    asins.filter(a => a.is_restricted).forEach(a => {
      const type = a.restriction_type || 'Unknown';
      if (!restrictions[type]) restrictions[type] = 0;
      restrictions[type]++;
    });
    Object.entries(restrictions)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type.padEnd(20)}: ${count} (${(count/stats.restricted*100).toFixed(1)}%)`);
      });

    console.log('\n' + '='.repeat(70));
    console.log('💡 RECOMMANDATIONS:');
    console.log('='.repeat(70));

    if (opportunities.length > 0) {
      console.log(`✅ ${opportunities.length} opportunités immédiates (non restreints, sans Amazon)`);
    }

    if (restrictedOpportunities.length > 0) {
      console.log(`🎯 ${restrictedOpportunities.length} produits restreints avec excellent BSR → Priorité ungating`);
      const topBrands = [...new Set(restrictedOpportunities.map(a => a.brand))];
      console.log(`   Marques à débloquer: ${topBrands.slice(0, 5).join(', ')}`);
    }

    const highCompetition = asins.filter(a => !a.amazon_present && a.seller_count > 10).length;
    if (highCompetition > 0) {
      console.log(`⚠️  ${highCompetition} produits avec >10 vendeurs (forte concurrence)`);
    }

    const lowBsr = asins.filter(a => a.bsr && a.bsr < 5000).length;
    console.log(`🔥 ${lowBsr} produits avec BSR < 5000 (très forte demande)`);

    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

analyzeRecentAsins();
