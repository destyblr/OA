require('dotenv').config({ path: '../.env' });
const scraper = require('./services/scraper');

(async () => {
  console.log('🧪 TEST RÉEL - AVEC FILTRES PRIX\n');

  try {
    console.log('📦 Scraping catégorie Jouets avec filtre ≤12€...\n');

    const products = await scraper.scrapeFnacPro(
      12, // maxPrice
      ['toys'], // categories
      (progress) => {
        console.log(`   📊 Progression:`, progress);
      }
    );

    console.log('\n✅ RÉSULTATS:');
    console.log(`   Total produits trouvés: ${products.length}`);

    if (products.length > 0) {
      console.log('\n📋 Premiers produits:');
      products.slice(0, 5).forEach((p, i) => {
        console.log(`\n   ${i + 1}. ${p.title.substring(0, 60)}...`);
        console.log(`      Prix: ${p.price}€ HT`);
        console.log(`      EAN: ${p.ean || 'À récupérer'}`);
        console.log(`      URL: ${p.url.substring(0, 80)}...`);
      });

      // Stats
      const withEAN = products.filter(p => p.ean).length;
      const avgPrice = (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2);
      const maxPrice = Math.max(...products.map(p => p.price));

      console.log('\n📊 STATISTIQUES:');
      console.log(`   - Produits avec EAN: ${withEAN}/${products.length}`);
      console.log(`   - Prix moyen: ${avgPrice}€ HT`);
      console.log(`   - Prix max: ${maxPrice}€ HT`);
    }

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
