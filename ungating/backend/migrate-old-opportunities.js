// Script de migration : Lier les anciennes opportunities à un scan "Migration"
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

(async () => {
  console.log('\n🔄 MIGRATION DES ANCIENNES OPPORTUNITIES\n');

  try {
    // 1. Compter les opportunities sans scan_id
    const { data: orphanOpps, error: countError } = await supabase
      .from('opportunities')
      .select('*')
      .is('scan_id', null);

    if (countError) throw countError;

    if (!orphanOpps || orphanOpps.length === 0) {
      console.log('✅ Aucune opportunity orpheline trouvée. Migration non nécessaire.\n');
      process.exit(0);
    }

    console.log(`📊 ${orphanOpps.length} opportunities sans scan_id trouvées\n`);

    // 2. Calculer le coût total
    const totalCost = orphanOpps.reduce((sum, opp) => sum + (parseFloat(opp.cost_ttc) || 0), 0);

    console.log(`💰 Coût total: ${totalCost.toFixed(2)}€\n`);

    // 3. Créer un scan "Migration" avec toutes les anciennes données
    console.log('📦 Création du scan "Migration"...');

    const { data: migrationScan, error: scanError } = await supabase
      .from('scans')
      .insert({
        max_price: 20,
        categories: ['beauty', 'toys', 'home'],
        status: 'completed',
        results_count: orphanOpps.length,
        total_cost: totalCost,
        scan_date: new Date().toISOString()
      })
      .select()
      .single();

    if (scanError) throw scanError;

    console.log(`✅ Scan #${migrationScan.id} créé\n`);

    // 4. Mettre à jour toutes les opportunities orphelines
    console.log(`🔗 Liaison des ${orphanOpps.length} opportunities au scan #${migrationScan.id}...`);

    const { error: updateError } = await supabase
      .from('opportunities')
      .update({ scan_id: migrationScan.id })
      .is('scan_id', null);

    if (updateError) throw updateError;

    console.log(`✅ ${orphanOpps.length} opportunities mises à jour\n`);

    // 5. Vérification
    const { data: remainingOrphans, error: checkError } = await supabase
      .from('opportunities')
      .select('id')
      .is('scan_id', null);

    if (checkError) throw checkError;

    if (remainingOrphans.length === 0) {
      console.log('✅ MIGRATION RÉUSSIE ! Toutes les opportunities sont maintenant liées.\n');
    } else {
      console.log(`⚠️ ${remainingOrphans.length} opportunities orphelines restantes.\n`);
    }

    // 6. Résumé
    console.log('📋 RÉSUMÉ:');
    console.log(`   - Scan créé: #${migrationScan.id}`);
    console.log(`   - Opportunities migrées: ${orphanOpps.length}`);
    console.log(`   - Coût total: ${totalCost.toFixed(2)}€`);
    console.log('\n✅ Migration terminée\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur migration:', err.message);
    process.exit(1);
  }
})();
