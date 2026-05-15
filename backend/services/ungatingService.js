const supabase = require('../config/supabase');
const scraper = require('./scraper');

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

      // ÉTAPE 1 : Scraper FNAC Pro (0-40%)
      updateProgress('fnac', 5, { productsScraped: 0 });
      const products = await scraper.scrapeFnacPro(maxPrice, cats, (progressData) => {
        const progress = 5 + (progressData.categoryIndex / progressData.totalCategories) * 35;
        updateProgress('fnac', progress, {
          productsScraped: progressData.productsFound,
          currentCategory: progressData.category
        });
      });
      updateProgress('fnac', 40, { productsScraped: products.length });

      // ÉTAPE 2 : Check restrictions Seller Central avec EAN (40-80%)
      updateProgress('seller_central', 42, { asinsChecked: 0 });
      const restricted = await scraper.checkRestrictions(products, (progressData) => {
        const progress = 40 + (progressData.checked / progressData.total) * 40;
        updateProgress('seller_central', progress, {
          asinsChecked: progressData.checked,
          restrictionsFound: progressData.restrictedFound
        });
      });
      updateProgress('seller_central', 80, { restrictionsFound: restricted.length });

      // ÉTAPE 3 : Détecter type + Calculer score (80-88%)
      updateProgress('score', 82, {});
      const opportunities = restricted.map(product => {
        const type = this.detectType(product.approvalText);
        const score = this.calculateScore(product, type);
        return { ...product, ...type, ...score };
      });
      updateProgress('score', 88, {});

      // ÉTAPE 4 : Sauvegarder en base (88-96%)
      updateProgress('supabase', 90, {});
      await this.saveOpportunities(scanId, opportunities);
      updateProgress('supabase', 96, {});

      // ÉTAPE 5 : Finaliser (96-100%)
      const results = opportunities.sort((a, b) => b.score - a.score);

      // Mettre à jour le scan dans Supabase
      await supabase
        .from('scans')
        .update({
          status: 'completed',
          results_count: results.length,
          total_cost: results.reduce((sum, r) => sum + r.costTTC, 0)
        })
        .eq('id', scanId);

      updateProgress('complete', 100, {});

      // Envoyer les résultats finaux
      io.emit(`scan:${scanId}:complete`, results);

      // Nettoyer le browser Puppeteer
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
