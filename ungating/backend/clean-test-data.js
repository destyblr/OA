#!/usr/bin/env node
/**
 * Supprime les données de test de profitable_asins
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const supabase = require('./config/supabase');

async function cleanTestData() {
  console.log('🧹 NETTOYAGE DONNÉES TEST\n');
  console.log('='.repeat(60));

  try {
    // Supprimer tous les produits avec source = 'test_mode'
    const { data, error } = await supabase
      .from('profitable_asins')
      .delete()
      .eq('source', 'test_mode')
      .select();

    if (error) throw error;

    console.log(`✅ ${data.length} produits test supprimés`);
    console.log('\nProduits supprimés:');
    data.forEach(p => {
      console.log(`   - ${p.asin} - ${p.brand} - ${p.title?.substring(0, 40)}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Nettoyage terminé !');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

cleanTestData();
