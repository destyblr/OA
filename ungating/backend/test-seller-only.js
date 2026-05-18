require('dotenv').config();
const scraper = require('./services/scraper-hybrid.js');

async function main() {
  console.log('🧪 TEST SELLER CENTRAL UNIQUEMENT\n');

  try {
    // Initialiser Playwright et Puppeteer
    await scraper.init();

    const ean = '5010996468093';
    console.log(`📦 Test avec EAN: ${ean}\n`);

    // Vérifier restriction
    const result = await scraper.checkSellerCentralWithPlaywright(ean);

    if (result) {
      console.log('\n✅ RÉSULTAT:');
      console.log(`   ASIN: ${result.asin}`);
      console.log(`   Restreint: ${result.isRestricted}`);
      if (result.isRestricted) {
        console.log(`   Type: ${result.type}`);
        console.log(`   Texte: ${result.approvalText}`);
        console.log(`   Unités: ${result.units}`);
        if (result.bonusCategory) {
          console.log(`   Bonus catégorie: ${result.bonusCategory}`);
        }
      }
    } else {
      console.log('\n⚠️ Aucun résultat (ASIN non trouvé ou erreur)');
    }

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    console.error(err.stack);
  } finally {
    // Ne pas fermer le navigateur pour pouvoir voir le résultat
    console.log('\n✓ Test terminé (navigateur reste ouvert)');
  }
}

main();
