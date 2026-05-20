// Supprimer des produits par EAN
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const eansToDelete = ['8710103997122', '9782075172929'];

(async () => {
  console.log(`🗑️  Suppression de ${eansToDelete.length} produits...\n`);

  for (const ean of eansToDelete) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('ean', ean);

    if (error) {
      console.log(`❌ ${ean}: ${error.message}`);
    } else {
      console.log(`✅ ${ean} supprimé`);
    }
  }

  console.log('\n✅ Terminé\n');
  process.exit(0);
})();
