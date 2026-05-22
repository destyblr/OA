#!/usr/bin/env node
/**
 * Test différentes opérations pour détecter Hazmat
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const SellingPartnerAPI = require('amazon-sp-api');

async function testHazmatOperations() {
  console.log('🔍 Test Hazmat - Différentes opérations\n');

  const client = new SellingPartnerAPI({
    region: 'eu',
    refresh_token: process.env.SP_API_REFRESH_TOKEN,
    credentials: {
      SELLING_PARTNER_APP_CLIENT_ID: process.env.SP_API_CLIENT_ID,
      SELLING_PARTNER_APP_CLIENT_SECRET: process.env.SP_API_CLIENT_SECRET
    }
  });

  const ASIN_TEST = 'B0G5QG3KMG';

  // Test 1: FBA Inventory API - différentes opérations
  const fbaOps = [
    { endpoint: 'fbaInventory', operation: 'getInventorySummaries' },
    { endpoint: 'fbaInventory', operation: 'getFeatureInventory' },
    { endpoint: 'fulfillmentInbound', operation: 'getInboundGuidance' },
    { endpoint: 'fulfillmentInbound', operation: 'getPreorderInfo' }
  ];

  for (const test of fbaOps) {
    try {
      console.log(`\n▶ ${test.endpoint} / ${test.operation}`);
      const result = await client.callAPI({
        operation: test.operation,
        endpoint: test.endpoint,
        query: {
          asin: ASIN_TEST,
          marketplaceIds: process.env.MARKETPLACE_ID
        }
      });
      console.log(`✅ MARCHE!`, JSON.stringify(result).substring(0, 200));
    } catch (e) {
      console.log(`❌`, e.message.substring(0, 100));
    }
  }

  // Test 2: Catalog API - peut avoir des infos Hazmat
  try {
    console.log(`\n▶ catalogItems / getCatalogItem`);
    const result = await client.callAPI({
      operation: 'getCatalogItem',
      endpoint: 'catalogItems',
      path: { asin: ASIN_TEST },
      query: {
        marketplaceIds: process.env.MARKETPLACE_ID,
        includedData: 'attributes,identifiers,productTypes'
      }
    });
    console.log(`✅ Catalog:`, JSON.stringify(result).substring(0, 300));

    // Chercher des indices Hazmat
    const json = JSON.stringify(result);
    if (json.toLowerCase().includes('hazmat') ||
        json.toLowerCase().includes('dangerous') ||
        json.toLowerCase().includes('battery')) {
      console.log('⚠️  HAZMAT DÉTECTÉ dans catalog!');
    }
  } catch (e) {
    console.log(`❌`, e.message);
  }
}

testHazmatOperations();
