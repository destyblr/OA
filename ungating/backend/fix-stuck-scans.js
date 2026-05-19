// Corriger les scans bloqués en "running"
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

(async () => {
  console.log('\n🔧 CORRECTION DES SCANS BLOQUÉS\n');

  try {
    // 1. Récupérer tous les scans "running"
    const { data: stuckScans, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('status', 'running')
      .order('scan_date', { ascending: false });

    if (scanError) throw scanError;

    if (!stuckScans || stuckScans.length === 0) {
      console.log('✅ Aucun scan bloqué trouvé\n');
      process.exit(0);
    }

    console.log(`📊 ${stuckScans.length} scans bloqués trouvés\n`);

    // 2. Pour chaque scan, compter les opportunities et mettre à jour
    for (const scan of stuckScans) {
      console.log(`🔍 Scan #${scan.id}...`);

      // Compter les opportunities de ce scan
      const { data: opps, error: oppError } = await supabase
        .from('opportunities')
        .select('cost_ttc')
        .eq('scan_id', scan.id);

      if (oppError) {
        console.log(`   ⚠️ Erreur fetch: ${oppError.message}`);
        continue;
      }

      const resultsCount = opps?.length || 0;
      const totalCost = opps?.reduce((sum, o) => sum + (parseFloat(o.cost_ttc) || 0), 0) || 0;

      console.log(`   → ${resultsCount} résultats, ${totalCost.toFixed(2)}€`);

      // Mettre à jour le scan
      const { error: updateError } = await supabase
        .from('scans')
        .update({
          status: 'completed',
          results_count: resultsCount,
          total_cost: totalCost
        })
        .eq('id', scan.id);

      if (updateError) {
        console.log(`   ❌ Erreur update: ${updateError.message}`);
      } else {
        console.log(`   ✅ Mis à jour\n`);
      }
    }

    console.log('✅ Correction terminée\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
})();
