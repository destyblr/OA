require('dotenv').config();
const supabase = require('./config/supabase');

/**
 * Met à jour les unités pour HP (100) et Logitech (10) en base
 */
async function updateBrandUnits() {
  console.log('🔧 Mise à jour des unités pour HP et Logitech...\n');

  try {
    // 1. Mettre à jour HP → 100 unités
    const { data: hpRestrictions, error: hpError } = await supabase
      .from('restrictions')
      .update({ units_required: 100 })
      .ilike('approval_text', '%HP%')
      .select();

    if (hpError) throw hpError;
    console.log(`✅ HP: ${hpRestrictions?.length || 0} restrictions mises à jour → 100 unités`);

    // 2. Mettre à jour Logitech → 10 unités
    const { data: logiRestrictions, error: logiError } = await supabase
      .from('restrictions')
      .update({ units_required: 10 })
      .ilike('approval_text', '%Logitech%')
      .select();

    if (logiError) throw logiError;
    console.log(`✅ Logitech: ${logiRestrictions?.length || 0} restrictions mises à jour → 10 unités`);

    // 3. Recalculer les coûts dans opportunities
    const restrictionIds = [
      ...(hpRestrictions || []).map(r => r.id),
      ...(logiRestrictions || []).map(r => r.id)
    ];

    for (const restrictionId of restrictionIds) {
      const { data: opp } = await supabase
        .from('opportunities')
        .select('*, products(*), restrictions(*)')
        .eq('restriction_id', restrictionId)
        .single();

      if (opp) {
        const TVA = 0.20;
        const costHT = opp.products.price * opp.restrictions.units_required;
        const costTTC = costHT * (1 + TVA);
        const bonus = opp.restrictions.type === 'CATEGORY' ? 1.5 : 1.0;
        const score = bonus / costTTC;

        await supabase
          .from('opportunities')
          .update({
            cost_ht: parseFloat(costHT.toFixed(2)),
            cost_ttc: parseFloat(costTTC.toFixed(2)),
            score: parseFloat(score.toFixed(6))
          })
          .eq('id', opp.id);
      }
    }

    console.log(`✅ Coûts recalculés pour ${restrictionIds.length} opportunités\n`);
    console.log('✅ Mise à jour terminée ! Rafraîchis le dashboard.\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
  }
}

updateBrandUnits();
