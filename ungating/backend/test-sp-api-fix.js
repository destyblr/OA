#!/usr/bin/env node
/**
 * Test SP-API - Vérifier endpoints disponibles
 */

// Désactiver la vérification SSL stricte (temporaire pour test)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const SellingPartnerAPI = require('amazon-sp-api');

async function testSPAPI() {
  console.log('🔍 Test SP-API - Vérification endpoints\n');

  try {
    const client = new SellingPartnerAPI({
      region: 'eu',
      refresh_token: process.env.SP_API_REFRESH_TOKEN,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.SP_API_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.SP_API_CLIENT_SECRET
      }
    });

    const ASIN_TEST = 'B0G5QG3KMG'; // Premier ASIN du scan

    console.log('='.repeat(60));
    console.log('TEST 1: Catalog (devrait marcher)');
    console.log('='.repeat(60));
    try {
      const catalog = await client.callAPI({
        operation: 'getCatalogItem',
        endpoint: 'catalog',
        path: { asin: ASIN_TEST },
        query: {
          marketplaceIds: process.env.MARKETPLACE_ID,
          includedData: 'attributes,summaries'
        }
      });
      console.log('✅ Catalog marche:', catalog.asin);
    } catch (e) {
      console.log('❌ Catalog erreur:', e.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Listings Restrictions');
    console.log('='.repeat(60));

    // Essayer différentes syntaxes
    const endpoints = ['listings', 'listingsRestrictions', 'listings_restrictions', 'listingsItems'];

    for (const ep of endpoints) {
      try {
        console.log(`\nTentative avec endpoint: "${ep}"`);
        const result = await client.callAPI({
          operation: 'getListingsRestrictions',
          endpoint: ep,
          query: {
            asin: ASIN_TEST,
            sellerId: process.env.SELLER_ID,
            marketplaceIds: process.env.MARKETPLACE_ID,
            conditionType: 'new_new'
          }
        });
        console.log(`✅ "${ep}" MARCHE!`, result);
        break;
      } catch (e) {
        console.log(`❌ "${ep}" erreur:`, e.message.substring(0, 100));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: FBA Inbound (Hazmat)');
    console.log('='.repeat(60));

    const fbaEndpoints = [
      'fba_inbound', 'fbaInbound', 'fbainbound', 'fba_inventory',
      'fbaInventory', 'fulfillmentInbound', 'fbaInboundEligibility',
      'fbaInboundServiceability', 'productFeesEstimate'
    ];

    for (const ep of fbaEndpoints) {
      try {
        console.log(`\nTentative avec endpoint: "${ep}"`);
        const result = await client.callAPI({
          operation: 'getItemEligibilityPreview',
          endpoint: ep,
          query: {
            asin: ASIN_TEST,
            program: 'INBOUND',
            marketplaceIds: process.env.MARKETPLACE_ID
          }
        });
        console.log(`✅ "${ep}" MARCHE!`, result);
        break;
      } catch (e) {
        console.log(`❌ "${ep}" erreur:`, e.message.substring(0, 100));
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testSPAPI();
