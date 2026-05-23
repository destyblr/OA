const SellingPartnerAPI = require('amazon-sp-api');
require('dotenv').config();

// Désactiver vérification SSL stricte (nécessaire pour amazon-sp-api)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Service pour interagir avec Amazon SP-API
 */
class AmazonSPAPI {
  constructor() {
    this.client = new SellingPartnerAPI({
      region: 'eu',
      refresh_token: process.env.SP_API_REFRESH_TOKEN,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.SP_API_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.SP_API_CLIENT_SECRET
      }
    });
    this.sellerId = process.env.SELLER_ID;
    this.marketplaceId = process.env.MARKETPLACE_ID;
  }

  /**
   * Récupérer les informations d'un produit (marque, catégorie, titre)
   */
  async getCatalogItem(asin) {
    try {
      const result = await this.client.callAPI({
        operation: 'getCatalogItem',
        endpoint: 'catalogItems',
        path: {
          asin: asin
        },
        query: {
          marketplaceIds: this.marketplaceId,
          includedData: 'attributes,summaries,images'
        }
      });

      if (result && result.asin) {
        return {
          asin: result.asin,
          brand: result.attributes?.brand?.[0]?.value || 'Unknown',
          title: result.summaries?.[0]?.itemName || '',
          category: result.summaries?.[0]?.browseClassification?.displayName || '',
          imageUrl: result.images?.[0]?.images?.[0]?.link || null
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ SP-API Get Catalog Item Error (${asin}): ${error.message}`);
      return null;
    }
  }

  /**
   * Vérifier si un ASIN est restreint
   */
  async checkRestriction(asin) {
    try {
      const result = await this.client.callAPI({
        operation: 'getListingsRestrictions',
        endpoint: 'listingsRestrictions',
        query: {
          asin: asin,
          sellerId: this.sellerId,
          marketplaceIds: this.marketplaceId,
          conditionType: 'new_new'
        }
      });

      const restrictions = result.restrictions || [];

      if (restrictions.length === 0) {
        return {
          asin,
          isRestricted: false,
          type: null,
          reasons: []
        };
      }

      // Analyser les restrictions
      const restriction = restrictions[0];
      const reasons = restriction.reasons?.map(r => r.message || r.reasonCode) || [];

      // Déterminer le type de restriction
      let type = 'BRAND';
      if (reasons.some(r => r.toLowerCase().includes('category'))) {
        type = 'CATEGORY';
      }

      return {
        asin,
        isRestricted: true,
        type,
        reasons,
        approvalRequired: reasons.some(r =>
          r.toLowerCase().includes('approval') ||
          r.toLowerCase().includes('authorization')
        )
      };
    } catch (error) {
      // Si l'endpoint retourne 404, le produit n'est probablement pas restreint
      if (error.message.includes('404')) {
        return {
          asin,
          isRestricted: false,
          type: null,
          reasons: []
        };
      }

      console.error(`❌ SP-API Check Restriction Error (${asin}): ${error.message}`);
      return null;
    }
  }

  /**
   * Vérifier si un produit est Hazmat via FBA Inbound Eligibility API
   */
  async checkHazmat(asin) {
    try {
      const result = await this.client.callAPI({
        operation: 'getItemEligibilityPreview',
        endpoint: 'fbaInboundEligibility',
        query: {
          asin: asin,
          program: 'INBOUND',
          marketplaceIds: this.marketplaceId
        }
      });

      const isHazmat = result.isEligibleForProgram === false &&
        result.ineligibilityReasonList?.some(r =>
          r.toLowerCase().includes('hazmat') ||
          r.toLowerCase().includes('dangerous') ||
          r.toLowerCase().includes('battery') ||
          r.toLowerCase().includes('lithium')
        );

      return {
        asin,
        isHazmat,
        reasons: result.ineligibilityReasonList || []
      };
    } catch (error) {
      console.error(`❌ SP-API Check Hazmat Error (${asin}): ${error.message}`);
      return { asin, isHazmat: false, reasons: [] };
    }
  }

  /**
   * Calculer les frais FBA pour un produit
   */
  async getFBAFees(asin, price) {
    try {
      const result = await this.client.callAPI({
        operation: 'getMyFeesEstimateForASIN',
        endpoint: 'productFees',
        path: {
          asin: asin
        },
        body: {
          FeesEstimateRequest: {
            MarketplaceId: this.marketplaceId,
            PriceToEstimateFees: {
              ListingPrice: {
                CurrencyCode: 'EUR',
                Amount: price
              }
            },
            Identifier: asin,
            IsAmazonFulfilled: true
          }
        }
      });

      if (result.FeesEstimate) {
        const fees = result.FeesEstimate.FeeDetailList || [];
        const totalFees = fees.reduce((sum, fee) =>
          sum + parseFloat(fee.FinalFee?.Amount || 0), 0
        );

        return {
          asin,
          price,
          totalFees,
          referralFee: fees.find(f => f.FeeType === 'ReferralFee')?.FinalFee?.Amount || 0,
          fulfillmentFee: fees.find(f => f.FeeType === 'FBAFees')?.FinalFee?.Amount || 0
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ SP-API Get FBA Fees Error (${asin}): ${error.message}`);
      // Estimation si l'API échoue (15% referral + 3€ fulfillment)
      return {
        asin,
        price,
        totalFees: price * 0.15 + 3,
        referralFee: price * 0.15,
        fulfillmentFee: 3,
        estimated: true
      };
    }
  }

  /**
   * Récupérer le nombre de vendeurs sur un ASIN
   */
  async getCompetitivePricing(asin) {
    try {
      const result = await this.client.callAPI({
        operation: 'getCompetitivePricing',
        endpoint: 'productPricing',
        query: {
          marketplaceId: this.marketplaceId,
          asins: asin,
          ItemType: 'Asin'
        }
      });

      if (result && result.length > 0) {
        const product = result[0];
        const offerCount = product.Product?.CompetitivePricing?.NumberOfOfferListings || [];

        return {
          asin,
          totalOffers: offerCount.reduce((sum, o) => sum + (o.Count || 0), 0),
          fbaOffers: offerCount.find(o => o.condition === 'New' && o.fulfillmentChannel === 'Amazon')?.Count || 0
        };
      }

      return { asin, totalOffers: 0, fbaOffers: 0 };
    } catch (error) {
      console.error(`❌ SP-API Get Competitive Pricing Error (${asin}): ${error.message}`);
      return { asin, totalOffers: 0, fbaOffers: 0 };
    }
  }
}

module.exports = new AmazonSPAPI();
