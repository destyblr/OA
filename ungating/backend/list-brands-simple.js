// Lister toutes les marques restreintes
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

(async () => {
  console.log('\n📋 MARQUES EN BASE\n');

  try {
    const { data, error } = await supabase
      .from('restrictions')
      .select('approval_text')
      .eq('is_restricted', true);

    if (error) throw error;

    // Compter par marque
    const counts = {};
    data.forEach(r => {
      const brand = r.approval_text || 'Unknown';
      counts[brand] = (counts[brand] || 0) + 1;
    });

    // Afficher triées par fréquence
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([brand, count]) => {
        console.log(`${brand}: ${count} produits`);
      });

    console.log(`\n✅ Total: ${Object.keys(counts).length} marques\n`);
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
})();
