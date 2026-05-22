#!/usr/bin/env node
/**
 * Reset complet de la base de données Supabase
 * Supprime toutes les données des tables de scan
 */

// Fix SSL pour Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const supabase = require('./config/supabase');

async function resetDatabase() {
  console.log('🗑️  RESET BASE DE DONNÉES\n');
  console.log('⚠️  Ceci va supprimer TOUTES les données de scan!');
  console.log('='.repeat(60));

  try {
    // 1. Supprimer tous les ASIN
    console.log('\n📦 Suppression des ASIN...');
    const { error: asinError, count: asinCount } = await supabase
      .from('asin_details')
      .delete()
      .neq('asin', ''); // Supprime tout sauf vide (= tout)

    if (asinError) {
      console.error('❌ Erreur ASIN:', asinError.message);
    } else {
      console.log(`✅ ${asinCount || 'Tous les'} ASIN supprimés`);
    }

    // 2. Supprimer toutes les marques
    console.log('\n🏷️  Suppression des marques...');
    const { error: brandError, count: brandCount } = await supabase
      .from('brand_opportunities')
      .delete()
      .neq('brand', '');

    if (brandError) {
      console.error('❌ Erreur marques:', brandError.message);
    } else {
      console.log(`✅ ${brandCount || 'Toutes les'} marques supprimées`);
    }

    // 3. Supprimer l'historique des scans
    console.log('\n📊 Suppression historique scans...');
    const { error: scanError, count: scanCount } = await supabase
      .from('keepa_scan_history')
      .delete()
      .neq('id', 0);

    if (scanError) {
      console.error('❌ Erreur scans:', scanError.message);
    } else {
      console.log(`✅ ${scanCount || 'Tous les'} scans supprimés`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ BASE DE DONNÉES RESETÉE!');
    console.log('\nTu peux maintenant relancer les scans avec les filtres corrigés.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

resetDatabase();
