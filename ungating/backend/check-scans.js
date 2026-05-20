// Vérifier le contenu de la table scans
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

(async () => {
  console.log('\n📊 VÉRIFICATION TABLE SCANS\n');

  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('scan_date', { ascending: false });

    if (error) {
      console.error('❌ Erreur:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      process.exit(1);
    }

    console.log(`✅ ${data.length} scans trouvés\n`);

    if (data.length === 0) {
      console.log('⚠️ La table scans est VIDE\n');
    } else {
      console.log('📋 SCANS:\n');
      data.forEach(scan => {
        const date = new Date(scan.scan_date).toLocaleString('fr-FR');
        console.log(`   #${scan.id} - ${date}`);
        console.log(`      Status: ${scan.status}`);
        console.log(`      Prix max: ${scan.max_price}€`);
        console.log(`      Catégories: ${scan.categories?.join(', ') || 'N/A'}`);
        console.log(`      Résultats: ${scan.results_count || 0}`);
        console.log(`      Coût: ${scan.total_cost || 0}€`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
})();
