#!/usr/bin/env node
/**
 * Test: Recherche marque spécifique avec Keepa
 * Objectif: Vérifier si on peut filtrer par marque et combien ça coûte
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const axios = require('axios');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;
const BRAND = 'babyliss'; // Marque à tester

async function testBrandSearch() {
  console.log('🔍 TEST RECHERCHE MARQUE KEEPA\n');
  console.log('='.repeat(60));
  console.log(`🏷️  Marque: ${BRAND}`);
  console.log('='.repeat(60));

  try {
    // 1. Vérifier tokens disponibles
    console.log('\n📊 Étape 1: Vérification tokens...');
    const tokenCheck = await axios.get('https://api.keepa.com/token', {
      params: { key: KEEPA_API_KEY }
    });
    const tokensAvant = tokenCheck.data.tokensLeft;
    console.log(`   💰 Tokens disponibles: ${tokensAvant}`);

    // 2. Search API (recherche par terme comme sur Amazon)
    console.log('\n🔍 Étape 2: Search API (terme de recherche)...');
    console.log(`   🔎 Recherche: "${BRAND}"`);

    const response = await axios.get('https://api.keepa.com/search', {
      params: {
        key: KEEPA_API_KEY,
        domain: 4, // FR
        type: 'product',
        term: BRAND,
        stats: 365,
        page: 0,
        perPage: 20 // Limiter pour le test
      }
    });

    const asins = response.data.asinList || [];
    console.log(`\n   ✅ Résultats trouvés: ${asins.length} ASIN`);

    if (asins.length > 0) {
      console.log(`   📦 Premiers ASIN:`, asins.slice(0, 5).join(', '));
    }

    // 3. Vérifier tokens consommés
    console.log('\n📊 Étape 3: Vérification tokens consommés...');
    const tokenCheck2 = await axios.get('https://api.keepa.com/token', {
      params: { key: KEEPA_API_KEY }
    });
    const tokensApres = tokenCheck2.data.tokensLeft;
    const tokensUtilises = tokensAvant - tokensApres;

    console.log(`   💰 Tokens après: ${tokensApres}`);
    console.log(`   🎫 Tokens utilisés: ${tokensUtilises}`);

    // 4. Test avec Product API pour récupérer détails
    if (asins.length > 0) {
      console.log('\n📦 Étape 4: Récupération détails (3 premiers)...');
      const testAsins = asins.slice(0, 3);

      const detailsResponse = await axios.get('https://api.keepa.com/product', {
        params: {
          key: KEEPA_API_KEY,
          domain: 4,
          asin: testAsins.join(','),
          stats: 365
        }
      });

      const products = detailsResponse.data.products || [];
      console.log(`   ✅ Détails récupérés: ${products.length} produits`);

      products.forEach(p => {
        console.log(`\n   📦 ${p.asin}`);
        console.log(`      Marque: ${p.brand || 'N/A'}`);
        console.log(`      Titre: ${p.title?.substring(0, 60)}...`);
        console.log(`      BSR: ${p.csv?.[3]?.[p.csv[3].length - 1] || 'N/A'}`);
      });

      // Tokens après détails
      const tokenCheck3 = await axios.get('https://api.keepa.com/token', {
        params: { key: KEEPA_API_KEY }
      });
      const tokensFinaux = tokenCheck3.data.tokensLeft;
      const tokensDetails = tokensApres - tokensFinaux;

      console.log(`\n   🎫 Tokens détails: ${tokensDetails}`);
    }

    // Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ TEST');
    console.log('='.repeat(60));
    console.log(`🏷️  Marque recherchée: ${BRAND}`);
    console.log(`📦 ASIN trouvés: ${asins.length}`);
    console.log(`🎫 Tokens query: ${tokensUtilises}`);
    console.log(`💡 Conclusion:`);

    if (asins.length === 0) {
      console.log(`   ❌ Aucun résultat - le filtre "brand" ne fonctionne peut-être pas`);
      console.log(`   💡 Il faudra peut-être scanner large puis filtrer en post-traitement`);
    } else {
      console.log(`   ✅ Le filtre marque fonctionne!`);
      console.log(`   💰 Coût pour scanner ${BRAND}:`);
      console.log(`      - Query 10 ASIN: ${tokensUtilises} tokens`);
      console.log(`      - Détails 3 ASIN: ~3 tokens`);
      console.log(`      - Pour 100 ASIN: ~11 query + 100 détails = 111 tokens`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.response?.data) {
      console.error('   Détails:', error.response.data);
    }
  }
}

testBrandSearch();
