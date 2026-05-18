// Fix SSL certificate issue (temporaire pour dev local)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: '../.env' });
const supabase = require('./config/supabase');

(async () => {
  console.log('🗑️  RESET BASE DE DONNÉES\n');

  try {
    // 1. Vider table opportunities (dépend de products et restrictions)
    console.log('📋 Suppression opportunities...');
    const { error: oppError } = await supabase
      .from('opportunities')
      .delete()
      .neq('id', 0); // Supprimer tout sauf ID 0 (qui n'existe pas)

    if (oppError && oppError.code !== 'PGRST116') { // PGRST116 = no rows found (OK)
      console.error('❌ Erreur opportunities:', oppError.message);
    } else {
      console.log('✅ Opportunities supprimées');
    }

    // 2. Vider table restrictions
    console.log('📋 Suppression restrictions...');
    const { error: restError } = await supabase
      .from('restrictions')
      .delete()
      .neq('id', 0);

    if (restError && restError.code !== 'PGRST116') {
      console.error('❌ Erreur restrictions:', restError.message);
    } else {
      console.log('✅ Restrictions supprimées');
    }

    // 3. Vider table products
    console.log('📋 Suppression products...');
    const { error: prodError } = await supabase
      .from('products')
      .delete()
      .neq('id', 0);

    if (prodError && prodError.code !== 'PGRST116') {
      console.error('❌ Erreur products:', prodError.message);
    } else {
      console.log('✅ Products supprimés');
    }

    // 4. Vider table scans
    console.log('📋 Suppression scans...');
    const { error: scanError } = await supabase
      .from('scans')
      .delete()
      .neq('id', 0);

    if (scanError && scanError.code !== 'PGRST116') {
      console.error('❌ Erreur scans:', scanError.message);
    } else {
      console.log('✅ Scans supprimés');
    }

    console.log('\n🎉 Base de données réinitialisée!\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
})();
