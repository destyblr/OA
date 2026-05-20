const express = require('express');
const router = express.Router();
const brandFinder = require('../services/brand-finder');
const scanTracker = require('../services/scan-tracker');
const keepaAPI = require('../services/keepa-api');
const supabase = require('../config/supabase');

/**
 * POST /api/brands/scan
 * Lancer un scan manuel
 */
router.post('/scan', async (req, res) => {
  try {
    console.log('🚀 Lancement scan manuel...');

    const result = await brandFinder.runDailyScan();

    res.json({
      success: true,
      scanId: result.scanId,
      summary: result.summary
    });
  } catch (error) {
    console.error(`❌ Error scan:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/brands/scan-history
 * Récupérer l'historique des scans
 */
router.get('/scan-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await scanTracker.getScanHistory(limit);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error(`❌ Error get history:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/brands/stats
 * Récupérer les stats globales
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await scanTracker.getGlobalStats();
    const tokensInfo = await keepaAPI.getTokensLeft();

    res.json({
      success: true,
      stats: {
        ...stats,
        tokensLeft: tokensInfo.tokensLeft,
        tokensRefillRate: tokensInfo.refillRate
      }
    });
  } catch (error) {
    console.error(`❌ Error get stats:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/brands/opportunities
 * Liste des marques découvertes
 */
router.get('/opportunities', async (req, res) => {
  try {
    const {
      category,
      minScore,
      hasFNAC,
      status,
      sortBy = 'priority_score',
      limit = 50
    } = req.query;

    let query = supabase
      .from('brand_opportunities')
      .select('*');

    // Filtres
    if (category) {
      query = query.eq('category', category);
    }

    if (minScore) {
      query = query.gte('priority_score', parseInt(minScore));
    }

    if (hasFNAC === 'true') {
      query = query.gt('nb_products_fnac', 0);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Tri
    const sortOrder = sortBy.startsWith('-') ? 'asc' : 'desc';
    const sortField = sortBy.replace('-', '');
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Limite
    query = query.limit(parseInt(limit));

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      brands: data
    });
  } catch (error) {
    console.error(`❌ Error get opportunities:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/brands/:brandName
 * Détails d'une marque
 */
router.get('/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;

    // Récupérer la marque
    const { data: brand, error: brandError } = await supabase
      .from('brand_opportunities')
      .select('*')
      .eq('brand', brandName)
      .single();

    if (brandError) throw brandError;

    // Récupérer les produits Amazon de cette marque
    const { data: amazonProducts, error: amazonError } = await supabase
      .from('asin_details')
      .select('*')
      .eq('brand', brandName)
      .order('bsr', { ascending: true })
      .limit(20);

    if (amazonError) throw amazonError;

    // Récupérer les produits FNAC de cette marque
    const { data: fnacProducts, error: fnacError } = await supabase
      .from('products')
      .select('*')
      .ilike('brand', `%${brandName}%`)
      .limit(20);

    if (fnacError) throw fnacError;

    res.json({
      success: true,
      brand,
      amazonProducts,
      fnacProducts
    });
  } catch (error) {
    console.error(`❌ Error get brand details:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/brands/:brandName/status
 * Mettre à jour le statut d'une marque
 */
router.patch('/:brandName/status', async (req, res) => {
  try {
    const { brandName } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('brand_opportunities')
      .update({ status, last_updated: new Date().toISOString() })
      .eq('brand', brandName)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      brand: data
    });
  } catch (error) {
    console.error(`❌ Error update brand status:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/brands/asins/recent
 * Liste des ASIN récemment scannés
 */
router.get('/asins/recent', async (req, res) => {
  try {
    const {
      limit = 100,
      brand,
      category,
      minBSR,
      maxBSR,
      isRestricted
    } = req.query;

    let query = supabase
      .from('asin_details')
      .select('*');

    // Filtres
    if (brand) {
      query = query.ilike('brand', `%${brand}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (minBSR) {
      query = query.gte('bsr', parseInt(minBSR));
    }

    if (maxBSR) {
      query = query.lte('bsr', parseInt(maxBSR));
    }

    if (isRestricted !== undefined) {
      query = query.eq('is_restricted', isRestricted === 'true');
    }

    // Tri par date (plus récents d'abord)
    query = query.order('first_seen', { ascending: false });

    // Limite
    query = query.limit(parseInt(limit));

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      asins: data,
      count: data.length
    });
  } catch (error) {
    console.error(`❌ Error get ASINs:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
