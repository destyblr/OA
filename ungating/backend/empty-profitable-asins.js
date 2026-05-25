#!/usr/bin/env node
/**
 * Vide la table profitable_asins
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const supabase = require('./config/supabase');

async function emptyTable() {
  console.log('🗑️  VIDAGE TABLE profitable_asins\n');
  console.log('='.repeat(60));

  try {
    const { data, error } = await supabase
      .from('profitable_asins')
      .delete()
      .neq('asin', ''); // Supprime tous les enregistrements

    if (error) throw error;

    console.log(`✅ ${data?.length || 0} produits supprimés`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

emptyTable();
