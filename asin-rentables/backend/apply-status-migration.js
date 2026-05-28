#!/usr/bin/env node
/**
 * Appliquer la migration status/rejection_reason
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const supabase = require('./config/supabase');

async function applyMigration() {
  console.log('🔄 Application migration: add-status-columns.sql\n');

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'add-status-columns.sql'),
      'utf8'
    );

    // Exécuter via raw query
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.log('⚠️  Note: exec_sql RPC non disponible');
      console.log('📋 Copie ce SQL dans Supabase SQL Editor:\n');
      console.log(sql);
      console.log('\n💡 Ou exécute les commandes manuellement');
    } else {
      console.log('✅ Migration appliquée avec succès !');
    }

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.log('\n📋 SQL à exécuter manuellement:\n');
    const sql = fs.readFileSync(
      path.join(__dirname, 'add-status-columns.sql'),
      'utf8'
    );
    console.log(sql);
  }
}

applyMigration();
