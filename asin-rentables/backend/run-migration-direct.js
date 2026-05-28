#!/usr/bin/env node
/**
 * Exécuter migration directement
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔄 Migration: Ajout colonnes status et rejection_reason\n');

  try {
    // Vérifier si les colonnes existent déjà
    const { data: columns, error: checkError } = await supabase
      .from('profitable_asins')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Erreur vérification table:', checkError.message);
      return;
    }

    console.log('✅ Table accessible');
    console.log('\n📋 Exécute ce SQL dans Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/[ton-projet]/editor\n');
    console.log('----------------------------------------');
    console.log(`
ALTER TABLE profitable_asins
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE profitable_asins
SET status = 'approved'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_profitable_asins_status ON profitable_asins(status);
    `);
    console.log('----------------------------------------\n');
    console.log('💡 Copie-colle ce SQL et exécute-le');

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
}

runMigration();
