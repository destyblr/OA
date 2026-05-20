// Test jointure Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

(async () => {
  console.log('🔍 TEST JOINTURE SUPABASE\n');

  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        products!inner(*),
        restrictions!inner(*)
      `)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }

    console.log(`📊 ${data.length} résultats\n`);

    data.forEach((opp, i) => {
      console.log(`\n━━━ Opportunity ${i + 1} ━━━`);
      console.log(`ID: ${opp.id}`);
      console.log(`Product ID: ${opp.product_id}`);
      console.log(`Restriction ID: ${opp.restriction_id}`);
      console.log(`\n📦 PRODUCT:`);
      console.log(`  - ID: ${opp.products?.id || 'NULL'}`);
      console.log(`  - Brand: ${opp.products?.brand || 'NULL'}`);
      console.log(`  - Title: ${opp.products?.title || 'NULL'}`);
      console.log(`  - Price: ${opp.products?.price || 'NULL'}€`);
      console.log(`  - EAN: ${opp.products?.ean || 'NULL'}`);
      console.log(`\n🔒 RESTRICTION:`);
      console.log(`  - Type: ${opp.restrictions?.type || 'NULL'}`);
      console.log(`  - Approval: ${opp.restrictions?.approval_text || 'NULL'}`);
      console.log(`  - Units: ${opp.restrictions?.units_required || 'NULL'}`);
      console.log(`\n💰 COSTS:`);
      console.log(`  - HT: ${opp.cost_ht}€`);
      console.log(`  - TTC: ${opp.cost_ttc}€`);
      console.log(`  - Score: ${opp.score}`);
    });

    console.log('\n✅ Test terminé\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
})();
