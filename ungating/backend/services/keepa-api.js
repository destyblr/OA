const axios = require('axios');
require('dotenv').config();

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;
const KEEPA_BASE_URL = 'https://api.keepa.com';

/**
 * Service pour interagir avec l'API Keepa
 */
class KeepaAPI {
  constructor() {
    this.apiKey = KEEPA_API_KEY;
    this.domain = 4; // Amazon.fr (France)
  }

  /**
   * Product Finder : Chercher des produits avec des filtres
   */
  async productFinder(filters) {
    try {
      const {
        category,
        bsrRange = [0, 30000],
        priceRange = [1500, 5000],
        minRating = 400,
        maxSellers = 5,
        excludeAmazon = true,
        page = 1,
        perPage = 100,
        sortBy = 'current_SALES'
      } = filters;

      // Construction de la requête Keepa (format correct avec _gte/_lte)
      const selection = {
        // Filtre BSR (Sales Rank)
        current_SALES_gte: bsrRange[0],
        current_SALES_lte: bsrRange[1],

        // Filtre Prix Buy Box
        current_BUY_BOX_SHIPPING_gte: priceRange[0],
        current_BUY_BOX_SHIPPING_lte: priceRange[1],

        // Filtre Vendeurs FBA
        current_COUNT_NEW_FBA_gte: 0,
        current_COUNT_NEW_FBA_lte: maxSellers,

        // Type de produit (0 = standard)
        productType: ['0'],

        // Catégorie
        ...(category && { rootCategory: this.getCategoryId(category) })
      };

      const params = {
        key: this.apiKey,
        domain: this.domain,
        selection: JSON.stringify(selection),
        sort: JSON.stringify([[sortBy, 'asc']]),
        page: page - 1, // Keepa commence à 0, pas à 1
        perPage
      };

      console.log(`🔍 Keepa Product Finder: ${category || 'All'} | Page ${page}`);

      const response = await axios.get(`${KEEPA_BASE_URL}/query`, { params });

      if (response.data.products) {
        const products = response.data.products.map(p => ({
          asin: p.asin,
          brand: p.brand || 'Unknown',
          title: p.title || '',
          salesRank: p.stats?.current[3] || null, // BSR actuel
          price: p.stats?.current[0] / 100 || null, // Prix en €
          rating: p.stats?.current[16] / 10 || null, // Rating sur 5
          reviewCount: p.stats?.current[17] || 0,
          sellerCount: p.stats?.current[6] || 0,
          amazonPresent: p.stats?.current[0] > 0, // Si Amazon a un prix
          imageUrl: p.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${p.imagesCSV.split(',')[0]}` : null
        }));

        console.log(`   ✅ ${products.length} produits trouvés`);
        console.log(`   🎫 Tokens utilisés: ~10`);

        return {
          products,
          tokensUsed: 10, // Estimation
          total: response.data.totalResults || products.length
        };
      }

      return { products: [], tokensUsed: 10, total: 0 };
    } catch (error) {
      console.error(`❌ Keepa API Error: ${error.message}`);
      throw new Error(`Keepa Product Finder failed: ${error.message}`);
    }
  }

  /**
   * Récupérer les tokens restants
   */
  async getTokensLeft() {
    try {
      const response = await axios.get(`${KEEPA_BASE_URL}/token`, {
        params: { key: this.apiKey }
      });

      return {
        tokensLeft: response.data.tokensLeft || 0,
        refillRate: response.data.refillRate || 1, // tokens/minute
        refillIn: response.data.refillIn || 0 // minutes avant prochain token
      };
    } catch (error) {
      console.error(`❌ Keepa Token Check Error: ${error.message}`);
      return { tokensLeft: 0, refillRate: 1, refillIn: 0 };
    }
  }

  /**
   * Mapper les catégories vers les IDs Keepa
   */
  getCategoryId(category) {
    const categoryMap = {
      // Français
      'Bébé': 1063252,
      'Animaux': 11273704031,
      'Beauté': 3760911,
      'Épicerie': 9699053031,
      // Anglais (legacy)
      'Baby': 1063252,
      'Pet': 11273704031,
      'Beauty': 3760911,
      'Grocery': 9699053031,
      'Toys': 547082
    };

    return categoryMap[category] || null;
  }

  /**
   * Vérifier si un ASIN existe et récupérer ses données
   */
  async getProduct(asin) {
    try {
      const params = {
        key: this.apiKey,
        domain: this.domain,
        asin: asin,
        stats: 1
      };

      const response = await axios.get(`${KEEPA_BASE_URL}/product`, { params });

      if (response.data.products && response.data.products.length > 0) {
        const p = response.data.products[0];
        return {
          asin: p.asin,
          brand: p.brand,
          title: p.title,
          salesRank: p.stats?.current[3],
          price: p.stats?.current[0] / 100,
          rating: p.stats?.current[16] / 10,
          reviewCount: p.stats?.current[17]
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Keepa Get Product Error (${asin}): ${error.message}`);
      return null;
    }
  }
}

module.exports = new KeepaAPI();
