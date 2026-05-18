// Fix SSL certificate issue (temporaire pour dev local)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: '../.env' });
const scraper = require('./services/scraper');

(async () => {
  console.log('🧪 TEST SCRAPER - Produit par produit\n');

  try {
    const scanId = 'test-' + Date.now();

    console.log('📦 Lancement scan avec max 3 produits pour test...\n');

    // Modifier temporairement le max pour le test
    const originalMax = 60;

    await scraper.runScan(
      scanId,
      12, // maxPrice
      ['toys'], // categories
      (progress) => {
        console.log(`\n📊 Progression: ${progress.productsProcessed}/${progress.maxProducts}`);
        console.log(`   Produit actuel: ${progress.currentProduct?.substring(0, 50)}...`);
      }
    );

    console.log('\n✅ Test terminé !');
    console.log('   Chrome devrait rester ouvert - ferme-le manuellement si besoin\n');

    await scraper.close();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    console.error(err.stack);
    await scraper.close();
    process.exit(1);
  }
})();
