// Fix prix HT/TTC pour les opportunities existantes
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

(async () => {
  console.log('🔧 CORRECTION PRIX HT/TTC\n');

  try {
    // Récupérer toutes les opportunities avec les prix actuels
    const { data: opportunities, error } = await supabase
      .from('opportunities')
      .select('id, cost_ht, cost_ttc');

    if (error) throw error;

    console.log(`📋 ${opportunities.length} opportunities à corriger\n`);

    const TVA = 0.20;

    for (const opp of opportunities) {
      const oldHT = opp.cost_ht;
      const oldTTC = opp.cost_ttc;

      // Ancien calcul (incorrect):
      // costHT = prix FNAC × unités
      // costTTC = costHT × 1.20
      //
      // Mais prix FNAC est déjà TTC ! Donc:
      // Le vrai TTC = oldHT (qui contenait prix FNAC × unités)
      // Le vrai HT = vrai TTC / 1.20

      const correctTTC = oldHT; // L'ancien HT était en fait le TTC
      const correctHT = correctTTC / (1 + TVA);

      // Mettre à jour
      const { error: updateError } = await supabase
        .from('opportunities')
        .update({
          cost_ht: correctHT,
          cost_ttc: correctTTC
        })
        .eq('id', opp.id);

      if (updateError) {
        console.error(`❌ Erreur ID ${opp.id}:`, updateError.message);
      } else {
        console.log(`✅ ID ${opp.id}: HT=${correctHT.toFixed(2)}€ TTC=${correctTTC.toFixed(2)}€ (avant: HT=${oldHT.toFixed(2)}€ TTC=${oldTTC.toFixed(2)}€)`);
      }
    }

    console.log('\n🎉 Prix corrigés!\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
})();
