const supabase = require('../config/supabase');
const scraper = require('./scraper-hybrid-v2');

class UngatingService {
  constructor() {
    this.activeScans = new Map();
  }

  /**
   * Démarre un nouveau scan
   * @param {number} maxPrice - Prix maximum
   * @param {array} cats - Catégories sélectionnées
   * @param {object} io - Instance Socket.io pour les mises à jour temps réel
   */
  async startScan(maxPrice, cats, io) {
    try {
      // Créer l'enregistrement dans Supabase
      const { data: scan, error } = await supabase
        .from('scans')
        .insert({
          max_price: maxPrice,
          categories: cats,
          status: 'running'
        })
        .select()
        .single();

      if (error) throw error;

      const scanId = scan.id.toString();

      // Initialiser le tracking
      this.activeScans.set(scanId, {
        id: scanId,
        progress: 0,
        stage: 'metro',
        stats: {
          productsScraped: 0,
          eansMatched: 0,
          asinsChecked: 0,
          restrictionsFound: 0
        }
      });

      // Lancer le scan en background
      this.runScan(scanId, maxPrice, cats, io).catch(err => {
        console.error(`Error in scan ${scanId}:`, err);
      });

      return {
        scanId,
        status: 'started'
      };
    } catch (error) {
      console.error('Error starting scan:', error);
      throw error;
    }
  }

  /**
   * Exécute le scan complet (appelé en background)
   * Nouveau flow: produit par produit avec saves DB incrémentales
   */
  async runScan(scanId, maxPrice, cats, io) {
    try {
      const updateProgress = (stage, progress, stats) => {
        const scanData = {
          scanId,
          stage,
          progress,
          stats
        };
        this.activeScans.set(scanId, scanData);
        io.emit(`scan:${scanId}:progress`, scanData);
      };

      updateProgress('scanning', 5, { productsProcessed: 0 });

      // Le nouveau scraper gère TOUT: FNAC + Seller Central + DB saves produit par produit
      const totalProcessed = await scraper.runScan(scanId, maxPrice, cats, (progressData) => {
        const progress = 5 + (progressData.productsProcessed / progressData.maxProducts) * 90;
        updateProgress('scanning', progress, {
          productsProcessed: progressData.productsProcessed,
          maxProducts: progressData.maxProducts,
          currentProduct: progressData.currentProduct
        });
      });

      // Récupérer les résultats depuis la DB
      const { data: opportunities, error: fetchError } = await supabase
        .from('opportunities')
        .select(`
          *,
          products (*),
          restrictions (*)
        `)
        .eq('scan_id', scanId)
        .order('score', { ascending: false });

      let results = [];

      if (fetchError) {
        console.error('Error fetching opportunities:', fetchError);
      } else if (opportunities && opportunities.length > 0) {
        // Formater les résultats
        results = opportunities.map(opp => ({
          id: opp.id,
          brand: opp.products.brand,
          title: opp.products.title,
          price: opp.products.price,
          ean: opp.products.ean,
          asin: opp.restrictions.asin,
          url: opp.products.url,
          units: opp.restrictions.units_required,
          type: opp.restrictions.type,
          unlocks: opp.restrictions.approval_text,
          costHT: opp.cost_ht,
          costTTC: opp.cost_ttc,
          score: opp.score,
          hot: opp.score >= 4
        }));
      }

      // Si 0 opportunités → supprimer le scan (ne pas polluer l'historique)
      if (results.length === 0) {
        console.log(`\n⚠️ SCAN ${scanId}: 0 opportunités trouvées → suppression du scan\n`);
        await supabase
          .from('scans')
          .delete()
          .eq('id', scanId);

        updateProgress('complete', 100, {});
        io.emit(`scan:${scanId}:complete`, {
          message: 'Aucun produit restreint trouvé',
          results: []
        });
      } else {
        // Mettre à jour le scan avec les résultats
        await supabase
          .from('scans')
          .update({
            status: 'completed',
            results_count: results.length,
            total_cost: results.reduce((sum, r) => sum + (r.costTTC || 0), 0)
          })
          .eq('id', scanId);

        updateProgress('complete', 100, {});
        io.emit(`scan:${scanId}:complete`, results);
      }

      await scraper.close();

      // Nettoyer le tracking
      this.activeScans.delete(scanId);

    } catch (error) {
      console.error(`Scan ${scanId} failed:`, error);

      await supabase
        .from('scans')
        .update({ status: 'failed' })
        .eq('id', scanId);

      io.emit(`scan:${scanId}:error`, { error: error.message });

      // Nettoyer le browser en cas d'erreur
      await scraper.close().catch(() => {});

      this.activeScans.delete(scanId);
    }
  }

  /**
   * Démarre un scan pour une marque spécifique
   * @param {string} brand - Nom de la marque
   * @param {number} maxPrice - Prix maximum
   * @param {object} io - Instance Socket.io
   */
  async startBrandScan(brand, maxPrice, io) {
    // Utiliser le nom de la marque comme keyword de recherche
    // Le scraper va construire l'URL: https://www.fnacpro.com/SearchResult/ResultList.aspx?Search=<brand>
    return await this.startScan(maxPrice, [brand], io);
  }

  /**
   * Récupère la progression d'un scan
   */
  async getScanProgress(scanId) {
    return this.activeScans.get(scanId) || null;
  }

  /**
   * Récupère les résultats d'un scan terminé
   */
  async getScanResults(scanId) {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          products(*),
          restrictions(*)
        `)
        .eq('scan_id', scanId)
        .order('score', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting results:', error);
      return null;
    }
  }

  /**
   * Détecte si c'est une BRAND ou CATEGORY
   */
  detectType(approvalText) {
    const categoryKeywords = [
      'Baby Products', 'Grocery', 'Health', 'Beauty',
      'Pet Supplies', 'Toys', 'Jewelry', 'Watches',
      'Luggage', 'Sports', 'Automotive'
    ];

    for (const keyword of categoryKeywords) {
      if (approvalText.includes(keyword)) {
        return { type: 'CATEGORY', unlocks: keyword };
      }
    }

    return { type: 'BRAND', unlocks: approvalText };
  }

  /**
   * Calcule le score de priorité
   */
  calculateScore(product, typeInfo) {
    const TVA = 0.20;
    const costHT = product.price * product.units;
    const costTTC = costHT * (1 + TVA);

    const bonus = typeInfo.type === 'CATEGORY' ? 1.5 : 1.0;
    const rawScore = bonus / costTTC;

    // Convertir en étoiles (1-5)
    const stars = Math.min(5, Math.max(1, Math.ceil(rawScore * 1000)));

    return {
      score: rawScore,
      stars,
      costHT: parseFloat(costHT.toFixed(2)),
      costTTC: parseFloat(costTTC.toFixed(2))
    };
  }

  /**
   * Sauvegarde les opportunités en base
   */
  async saveOpportunities(scanId, opportunities) {
    try {
      // Sauvegarder les produits
      const { data: products, error: prodError } = await supabase
        .from('products')
        .upsert(
          opportunities.map(o => ({
            brand: o.brand,
            title: o.title,
            price: o.price,
            ean: o.ean,
            asin: o.asin,
            url: o.url
          })),
          { onConflict: 'ean' }
        )
        .select();

      if (prodError) throw prodError;

      // Sauvegarder les restrictions
      const { data: restrictions, error: restError } = await supabase
        .from('restrictions')
        .upsert(
          opportunities.map(o => ({
            asin: o.asin,
            is_restricted: true,
            units_required: o.units,
            approval_text: o.approvalText,
            type: o.type,
            category: o.unlocks
          })),
          { onConflict: 'asin' }
        )
        .select();

      if (restError) throw restError;

      // Sauvegarder les opportunités
      const { error: oppError } = await supabase
        .from('opportunities')
        .insert(
          opportunities.map((o, i) => ({
            scan_id: scanId,
            product_id: products[i].id,
            restriction_id: restrictions[i].id,
            score: o.score,
            cost_ht: o.costHT,
            cost_ttc: o.costTTC
          }))
        );

      if (oppError) throw oppError;

    } catch (error) {
      console.error('Error saving opportunities:', error);
      throw error;
    }
  }
}

module.exports = new UngatingService();
