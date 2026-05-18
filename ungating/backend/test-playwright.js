// Fix SSL certificate issue (temporaire pour dev local)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Charger les variables d'environnement
require('dotenv').config({ path: '../.env' });

const scraper = require('./services/scraper-playwright');

async function main() {
  console.log('🧪 TEST SCRAPER PLAYWRIGHT - Produit par produit\n');
  console.log('📦 Lancement scan avec max 3 produits pour test...\n');

  const scanId = 'TEST_' + Date.now();
  const maxPrice = 12;
  const categories = ['toys']; // Une seule catégorie pour test

  const progressCallback = (data) => {
    console.log(`\n📊 Progression: ${data.productsProcessed}/${data.maxProducts}`);
    console.log(`   Produit actuel: ${data.currentProduct}\n`);
  };

  try {
    await scraper.runScan(scanId, maxPrice, categories, progressCallback);
    console.log('\n✅ Test terminé !');
    console.log('   Chrome devrait rester ouvert - ferme-le manuellement si besoin\n');
  } catch (err) {
    console.error('\n❌ Erreur:', err);
    console.error(err.stack);
  }

  // NE PAS fermer le browser, pour debug
  // await scraper.close();
}

main();
