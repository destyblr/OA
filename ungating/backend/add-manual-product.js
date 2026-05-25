require('dotenv').config();
const supabase = require('./config/supabase');

async function addManualProduct() {
  const productData = {
    brand: 'Braun',
    title: 'Embouts jetables Braun LF 40EULA01 pour thermomètre',
    price: 6.66,
    ean: '4022167400062',
    asin: 'B077SWQTPB',
    url: 'https://www.fnacpro.com' // URL générique
  };

  const restrictionData = {
    asin: 'B077SWQTPB',
    is_restricted: true,
    units_required: 10,
    approval_text: 'Braun',
    type: 'BRAND',
    category: 'Braun'
  };

  try {
    console.log('📦 Ajout du produit Braun...');

    // 1. Ajouter le produit
    const { data: product, error: prodError } = await supabase
      .from('products')
      .upsert(productData, { onConflict: 'ean' })
      .select()
      .single();

    if (prodError) throw prodError;
    console.log(`✅ Produit créé: ID ${product.id}`);

    // 2. Ajouter la restriction
    const { data: restriction, error: restError } = await supabase
      .from('restrictions')
      .upsert(restrictionData, { onConflict: 'asin' })
      .select()
      .single();

    if (restError) throw restError;
    console.log(`✅ Restriction créée: ID ${restriction.id}`);

    // 3. Calculer et créer l'opportunité
    const TVA = 0.20;
    const costHT = productData.price * restrictionData.units_required;
    const costTTC = costHT * (1 + TVA);
    const bonus = 1.0; // BRAND
    const score = bonus / costTTC;

    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .insert({
        scan_id: null, // Ajout manuel
        product_id: product.id,
        restriction_id: restriction.id,
        score: parseFloat(score.toFixed(6)),
        cost_ht: parseFloat(costHT.toFixed(2)),
        cost_ttc: parseFloat(costTTC.toFixed(2))
      })
      .select()
      .single();

    if (oppError) throw oppError;

    console.log(`✅ Opportunité créée: ID ${opportunity.id}`);
    console.log(`   Coût HT: ${opportunity.cost_ht}€`);
    console.log(`   Coût TTC: ${opportunity.cost_ttc}€`);
    console.log(`   Score: ${opportunity.score}`);
    console.log('\n✅ Produit Braun ajouté avec succès !\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

addManualProduct();
