const supabase = require('../config/supabase');

/**
 * Service pour gérer l'historique des scans Keepa
 */
class ScanTracker {
  /**
   * Créer un nouveau scan dans l'historique
   */
  async createScan(config) {
    try {
      const { data, error } = await supabase
        .from('keepa_scan_history')
        .insert({
          category: config.category,
          subcategory: config.subcategory,
          bsr_min: config.bsrRange[0],
          bsr_max: config.bsrRange[1],
          price_min: config.priceRange[0] / 100,
          price_max: config.priceRange[1] / 100,
          max_sellers: config.maxSellers,
          amazon_present: !config.excludeAmazon,
          page_number: config.page,
          sort_by: config.sortBy,
          status: 'running'
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`📝 Scan créé: ID ${data.id}`);
      return data;
    } catch (error) {
      console.error(`❌ Error creating scan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mettre à jour le scan avec les résultats
   */
  async updateScan(scanId, results) {
    try {
      const { data, error } = await supabase
        .from('keepa_scan_history')
        .update({
          asins_found: results.asinsFound,
          asins_after_hazmat: results.asinsAfterHazmat,
          brands_found: results.brandsFound,
          brands_restricted: results.brandsRestricted,
          brands_with_fnac: results.brandsWithFNAC,
          tokens_used: results.tokensUsed,
          tokens_remaining: results.tokensRemaining,
          duration_seconds: results.durationSeconds,
          status: 'success'
        })
        .eq('id', scanId)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Scan mis à jour: ID ${scanId}`);
      return data;
    } catch (error) {
      console.error(`❌ Error updating scan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marquer un scan comme erreur
   */
  async markScanError(scanId, errorMessage) {
    try {
      await supabase
        .from('keepa_scan_history')
        .update({
          status: 'error',
          error_message: errorMessage
        })
        .eq('id', scanId);

      console.log(`❌ Scan marqué erreur: ID ${scanId}`);
    } catch (error) {
      console.error(`❌ Error marking scan as error: ${error.message}`);
    }
  }

  /**
   * Récupérer l'historique des scans
   */
  async getScanHistory(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('keepa_scan_history')
        .select('*')
        .order('scan_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error(`❌ Error getting scan history: ${error.message}`);
      return [];
    }
  }

  /**
   * Récupérer les stats globales
   */
  async getGlobalStats() {
    try {
      // Nombre total de scans
      const { count: totalScans } = await supabase
        .from('keepa_scan_history')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success');

      // Scans aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const { count: scansToday } = await supabase
        .from('keepa_scan_history')
        .select('*', { count: 'exact', head: true })
        .gte('scan_date', today)
        .eq('status', 'success');

      // Total ASIN analysés
      const { data: asinData } = await supabase
        .from('keepa_scan_history')
        .select('asins_found')
        .eq('status', 'success');

      const totalAsins = asinData?.reduce((sum, s) => sum + (s.asins_found || 0), 0) || 0;

      // Total marques
      const { count: totalBrands } = await supabase
        .from('brand_opportunities')
        .select('*', { count: 'exact', head: true });

      // Marques avec FNAC
      const { count: brandsWithFNAC } = await supabase
        .from('brand_opportunities')
        .select('*', { count: 'exact', head: true })
        .gt('nb_products_fnac', 0);

      // Dernier scan
      const { data: lastScan } = await supabase
        .from('keepa_scan_history')
        .select('*')
        .order('scan_date', { ascending: false })
        .limit(1)
        .single();

      return {
        totalScans: totalScans || 0,
        scansToday: scansToday || 0,
        totalAsins,
        totalBrands: totalBrands || 0,
        brandsWithFNAC: brandsWithFNAC || 0,
        lastScan: lastScan || null
      };
    } catch (error) {
      console.error(`❌ Error getting global stats: ${error.message}`);
      return {
        totalScans: 0,
        scansToday: 0,
        totalAsins: 0,
        totalBrands: 0,
        brandsWithFNAC: 0,
        lastScan: null
      };
    }
  }

  /**
   * Sauvegarder un ASIN dans la base
   */
  async saveAsin(asinData, scanId) {
    try {
      const { data, error } = await supabase
        .from('asin_details')
        .upsert({
          asin: asinData.asin,
          scan_id: scanId,
          brand: asinData.brand,
          title: asinData.title,
          category: asinData.category,
          bsr: asinData.bsr,
          price_amazon: asinData.price,
          rating: asinData.rating,
          review_count: asinData.reviewCount,
          seller_count: asinData.sellerCount,
          amazon_present: asinData.amazonPresent,
          is_restricted: asinData.isRestricted,
          restriction_type: asinData.restrictionType,
          is_hazmat: asinData.isHazmat,
          hazmat_reason: asinData.hazmatReason,
          image_url: asinData.imageUrl,
          last_checked: new Date().toISOString()
        }, { onConflict: 'asin' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`❌ Error saving ASIN ${asinData.asin}: ${error.message}`);
      return null;
    }
  }

  /**
   * Sauvegarder une marque dans brand_opportunities
   */
  async saveBrand(brandData, scanId) {
    try {
      const { data, error } = await supabase
        .from('brand_opportunities')
        .upsert({
          brand: brandData.brand,
          scan_id: scanId,
          nb_products_amazon: brandData.nbProductsAmazon,
          avg_bsr: brandData.avgBSR,
          min_bsr: brandData.minBSR,
          max_bsr: brandData.maxBSR,
          avg_price_amazon: brandData.avgPriceAmazon,
          category: brandData.category,
          example_asin: brandData.exampleAsin,
          is_restricted: brandData.isRestricted,
          restriction_type: brandData.restrictionType,
          restriction_reason: brandData.restrictionReason,
          nb_products_fnac: brandData.nbProductsFNAC,
          avg_price_fnac: brandData.avgPriceFNAC,
          avg_margin: brandData.avgMargin,
          estimated_monthly_sales: brandData.estimatedMonthlySales,
          estimated_monthly_profit: brandData.estimatedMonthlyProfit,
          unlocking_cost: brandData.unlockingCost,
          roi_percentage: brandData.roiPercentage,
          payback_days: brandData.paybackDays,
          priority_score: brandData.priorityScore,
          last_updated: new Date().toISOString()
        }, { onConflict: 'brand' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`❌ Error saving brand ${brandData.brand}: ${error.message}`);
      return null;
    }
  }
}

module.exports = new ScanTracker();
