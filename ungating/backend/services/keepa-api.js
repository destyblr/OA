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
        perPage = 30, // Réduit de 100 à 30 pour économiser les tokens
        sortBy = 'current_SALES'
      } = filters;

      // Construction de la requête Keepa (format correct avec _gte/_lte)
      const selection = {
        // Filtre de catégorie (OBLIGATOIRE pour avoir des résultats cohérents)
        ...(category && { rootCategory: this.getCategoryId(category) }),

        // BSR (Best Seller Rank)
        current_SALES_gte: bsrRange[0],
        current_SALES_lte: bsrRange[1],

        // Prix (en centimes d'euros pour Keepa)
        current_NEW_gte: priceRange[0],
        current_NEW_lte: priceRange[1],

        // Nombre de vendeurs FBA max
        current_COUNT_NEW_FBA_lte: maxSellers,

        // Exclure Amazon si demandé
        ...(excludeAmazon && { current_AMAZON: -1 })
      };

      const params = {
        key: this.apiKey,
        domain: this.domain,
        selection: JSON.stringify(selection),
        sort: JSON.stringify([[sortBy, 'asc']]),
        page: page - 1,
        perPage,
        stats: 90 // Demander les statistiques des produits
      };

      console.log(`🔍 Keepa Product Finder: ${category || 'All'} | Page ${page}`);
      console.log(`📋 Keepa Query:`, JSON.stringify(selection, null, 2));
      console.log(`🔑 Category ID: ${this.getCategoryId(category)}`);

      const response = await axios.get(`${KEEPA_BASE_URL}/query`, { params });

      if (response.data.asinList && response.data.asinList.length > 0) {
        // Limiter au nombre demandé par perPage
        const asinList = response.data.asinList.slice(0, perPage);
        const tokensForQuery = response.data.tokensConsumed || 0;

        console.log(`   ✅ ${asinList.length} ASIN trouvés`);
        console.log(`   🎫 Tokens query: ${tokensForQuery}`);

        // Récupérer les détails des produits par batch de 10
        console.log(`   📦 Récupération des détails (${asinList.length} ASIN)...`);
        const allProducts = [];
        let totalTokensForProducts = 0;

        for (let i = 0; i < asinList.length; i += 10) {
          const batch = asinList.slice(i, i + 10);
          const batchAsinString = batch.join(',');

          try {
            const products = await this.getProduct(batchAsinString);
            if (products && Array.isArray(products)) {
              allProducts.push(...products);
              totalTokensForProducts += batch.length; // 1 token par ASIN
            }
          } catch (error) {
            console.error(`   ⚠️  Erreur batch ${i}-${i+10}: ${error.message}`);
          }
        }

        const totalTokens = tokensForQuery + totalTokensForProducts;
        console.log(`   ✅ ${allProducts.length} produits avec détails`);
        console.log(`   🎫 Tokens utilisés: ${totalTokens} (query: ${tokensForQuery}, détails: ${totalTokensForProducts})`);

        return {
          products: allProducts,
          tokensUsed: totalTokens,
          total: response.data.totalResults || allProducts.length
        };
      }

      return { products: [], tokensUsed: response.data.tokensConsumed || 0, total: 0 };
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
   * Mapper les catégories vers les rootCategory Keepa
   */
  getCategoryId(category) {
    const categoryMap = {
      // Amazon.fr (domain 4) - rootCategory Keepa RÉELS
      'High-Tech': 13921051,           // High-Tech (Informatique, Smartphones, etc.)
      'Jeux et Jouets': 322086011,     // Jeux et Jouets
      'Hygiène et Santé': 197861031,   // Beauté, Santé, Bien-être
      'Cuisine et Maison': 57004031    // Électroménager, Cuisine
    };

    return categoryMap[category] || null;
  }

  /**
   * Vérifier si un ASIN existe et récupérer ses données
   * Supporte plusieurs ASIN séparés par des virgules (batch)
   */
  async getProduct(asin) {
    try {
      const params = {
        key: this.apiKey,
        domain: this.domain,
        asin: asin,
        stats: 90
      };

      const response = await axios.get(`${KEEPA_BASE_URL}/product`, { params });

      if (response.data.products && response.data.products.length > 0) {
        // Si un seul ASIN, retourner un objet
        if (response.data.products.length === 1) {
          const p = response.data.products[0];
          const hasPrice = p.stats?.current[1] && p.stats.current[1] > 0;
          return {
            asin: p.asin,
            brand: p.brand || 'Unknown',
            title: p.title || '',
            bsr: p.stats?.current[4] > 0 ? p.stats.current[4] : null,
            price: hasPrice ? p.stats.current[1] / 100 : null,
            priceNote: !hasPrice ? 'Prix Amazon non disponible' : null,
            rating: (p.stats?.current[11] && p.stats.current[11] > 0) ? p.stats.current[11] / 20 : null,
            reviewCount: (p.stats?.current[34] && p.stats.current[34] > 0) ? p.stats.current[34] : 0,
            sellerCount: (p.stats?.current[35] && p.stats.current[35] > 0) ? p.stats.current[35] : 0,
            amazonPresent: p.stats?.current[3] === 1,
            imageUrl: p.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${p.imagesCSV.split(',')[0]}` : null,
            rootCategory: p.rootCategory,
            categoryTree: p.categoryTree,
            tokensConsumed: response.data.tokensConsumed || 1
          };
        }

        // Si plusieurs ASIN, retourner un tableau
        return response.data.products.map(p => {
          const hasPrice = p.stats?.current[1] && p.stats.current[1] > 0;
          return {
            asin: p.asin,
            brand: p.brand || 'Unknown',
            title: p.title || '',
            bsr: p.stats?.current[4] > 0 ? p.stats.current[4] : null,
            price: hasPrice ? p.stats.current[1] / 100 : null,
            priceNote: !hasPrice ? 'Prix Amazon non disponible' : null,
            rating: (p.stats?.current[11] && p.stats.current[11] > 0) ? p.stats.current[11] / 20 : null,
            reviewCount: (p.stats?.current[34] && p.stats.current[34] > 0) ? p.stats.current[34] : 0,
            sellerCount: (p.stats?.current[35] && p.stats.current[35] > 0) ? p.stats.current[35] : 0,
            amazonPresent: p.stats?.current[3] === 1,
            imageUrl: p.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${p.imagesCSV.split(',')[0]}` : null,
            rootCategory: p.rootCategory,
            categoryTree: p.categoryTree
          };
        });
      }

      return null;
    } catch (error) {
      console.error(`❌ Keepa Get Product Error (${asin}): ${error.message}`);
      return null;
    }
  }
}

module.exports = new KeepaAPI();
