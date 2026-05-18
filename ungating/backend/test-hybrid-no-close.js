// Fix SSL certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '../.env' });

const scraper = require('./services/scraper-hybrid');

async function main() {
  console.log('🧪 TEST SCRAPER HYBRIDE (sans fermer Chrome)\n');
  console.log('   📍 FNAC Pro → Puppeteer');
  console.log('   📍 Seller Central → Playwright\n');
  console.log('📦 Lancement scan...\n');

  const scanId = 'HYBRID_' + Date.now();
  const maxPrice = 12;
  const categories = ['toys'];

  const progressCallback = (data) => {
    console.log(`\n📊 Progression: ${data.productsProcessed}/${data.maxProducts}`);
    console.log(`   Produit actuel: ${data.currentProduct}\n`);
  };

  try {
    await scraper.runScan(scanId, maxPrice, categories, progressCallback);
    console.log('\n✅ Test terminé !');
    console.log('   ⚠️  Chrome reste ouvert avec tes autres onglets\n');
  } catch (err) {
    console.error('\n❌ Erreur:', err);
    console.error(err.stack);
  }
}

main();
