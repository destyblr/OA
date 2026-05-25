const express = require('express');
const router = express.Router();
const ungatingService = require('../services/ungatingService');

// POST /api/ungating/scan/start
// Démarre un nouveau scan avec les paramètres fournis
router.post('/scan/start', async (req, res) => {
  try {
    const { maxPrice, cats } = req.body;

    if (!maxPrice || !cats || !Array.isArray(cats)) {
      return res.status(400).json({
        error: 'Invalid parameters. Required: maxPrice (number), cats (array)'
      });
    }

    const io = req.app.get('io');
    const result = await ungatingService.startScan(maxPrice, cats, io);

    res.json(result);
  } catch (error) {
    console.error('Error starting scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ungating/scan/:scanId/progress
// Récupère la progression d'un scan
router.get('/scan/:scanId/progress', async (req, res) => {
  try {
    const { scanId } = req.params;
    const progress = await ungatingService.getScanProgress(scanId);

    if (!progress) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error getting scan progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ungating/scan/:scanId/results
// Récupère les résultats d'un scan terminé
router.get('/scan/:scanId/results', async (req, res) => {
  try {
    const { scanId } = req.params;
    const results = await ungatingService.getScanResults(scanId);

    if (!results) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(results);
  } catch (error) {
    console.error('Error getting scan results:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ungating/scan/brand
// Démarre un scan pour une marque spécifique
router.post('/scan/brand', async (req, res) => {
  try {
    const { brand, maxPrice } = req.body;

    if (!brand) {
      return res.status(400).json({
        error: 'Invalid parameters. Required: brand (string)'
      });
    }

    const io = req.app.get('io');
    const result = await ungatingService.startBrandScan(brand, maxPrice || 10, io);

    res.json(result);
  } catch (error) {
    console.error('Error starting brand scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ungating/update-brand-units
// Met à jour les unités pour une ou plusieurs marques
router.post('/update-brand-units', async (req, res) => {
  const { brand, units } = req.body;

  // Si brand et units fournis, mettre à jour cette marque spécifique
  if (brand && units) {
    try {
      const supabase = require('../config/supabase');
      console.log(`🔧 Mise à jour: ${brand} → ${units} unités`);

      const { data: restrictions, error } = await supabase
        .from('restrictions')
        .update({ units_required: units })
        .ilike('approval_text', `%${brand}%`)
        .select();

      if (error) throw error;
      console.log(`✅ ${brand}: ${restrictions?.length || 0} restrictions mises à jour`);

      // Recalculer coûts
      let updated = 0;
      for (const restriction of restrictions || []) {
        const { data: opp } = await supabase
          .from('opportunities')
          .select('*, products(*), restrictions(*)')
          .eq('restriction_id', restriction.id)
          .single();

        if (opp) {
          const TVA = 0.20;
          const costHT = opp.products.price * units;
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

          updated++;
        }
      }

      return res.json({
        success: true,
        brand,
        restrictionsUpdated: restrictions?.length || 0,
        opportunitiesUpdated: updated
      });
    } catch (error) {
      console.error('❌ Erreur:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  // Sinon, mettre à jour HP et Logitech (comportement par défaut)
  try {
    const supabase = require('../config/supabase');
    console.log('🔧 Mise à jour des unités pour HP et Logitech...\n');

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

    let updated = 0;
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

        updated++;
      }
    }

    console.log(`✅ Coûts recalculés pour ${updated} opportunités\n`);

    res.json({
      success: true,
      hp: hpRestrictions?.length || 0,
      logitech: logiRestrictions?.length || 0,
      opportunitiesUpdated: updated
    });
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ungating/add-manual-product
// Ajoute manuellement un produit restreint
router.post('/add-manual-product', async (req, res) => {
  try {
    const { brand, title, price, ean, asin, units, url } = req.body;

    if (!brand || !price || !ean || !asin || !units) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = require('../config/supabase');

    // 1. Ajouter le produit
    const { data: product, error: prodError } = await supabase
      .from('products')
      .upsert({
        brand,
        title: title || `${brand} product`,
        price: parseFloat(price),
        ean,
        asin,
        url: url || 'https://www.fnacpro.com'
      }, { onConflict: 'ean' })
      .select()
      .single();

    if (prodError) throw prodError;

    // 2. Ajouter la restriction
    const { data: restriction, error: restError } = await supabase
      .from('restrictions')
      .upsert({
        asin,
        is_restricted: true,
        units_required: parseInt(units),
        approval_text: brand,
        type: 'BRAND',
        category: brand
      }, { onConflict: 'asin' })
      .select()
      .single();

    if (restError) throw restError;

    // 3. Créer l'opportunité
    const TVA = 0.20;
    const costHT = parseFloat(price) * parseInt(units);
    const costTTC = costHT * (1 + TVA);
    const score = 1.0 / costTTC;

    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .insert({
        scan_id: null,
        product_id: product.id,
        restriction_id: restriction.id,
        score: parseFloat(score.toFixed(6)),
        cost_ht: parseFloat(costHT.toFixed(2)),
        cost_ttc: parseFloat(costTTC.toFixed(2))
      })
      .select()
      .single();

    if (oppError) throw oppError;

    res.json({
      success: true,
      product: product.id,
      restriction: restriction.id,
      opportunity: opportunity.id,
      costTTC: opportunity.cost_ttc
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
