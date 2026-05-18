require('dotenv').config({ path: '../.env' });
const scraper = require('./services/scraper');

(async () => {
  console.log('🧪 TEST SCRAPER FNAC PRO\n');

  try {
    // Test 1: Scrape FNAC Pro
    console.log('📦 Test 1: Scraping FNAC Pro...');
    const products = await scraper.scrapeFnacPro(
      12, // maxPrice
      ['toys'], // categories
      (progress) => {
        console.log('   Progress:', progress);
      }
    );

    console.log('\n✅ Résultat:');
    console.log(`   - ${products.length} produits trouvés`);

    if (products.length > 0) {
      console.log('\n📋 Premier produit:');
      console.log(products[0]);
    }

    // Fermer le navigateur
    await scraper.close();
    console.log('\n✅ Test terminé');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    console.error(err.stack);
    await scraper.close();
    process.exit(1);
  }
})();
