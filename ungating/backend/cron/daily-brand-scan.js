const cron = require('node-cron');
const brandFinder = require('../services/brand-finder');

/**
 * CRON Job pour scanner automatiquement tous les jours
 *
 * Schedule : Tous les jours à 9h00
 */
function startDailyScan() {
  console.log('⏰ CRON Job configuré : Scan quotidien à 9h00\n');

  // '0 9 * * *' = Tous les jours à 9h00
  cron.schedule('0 9 * * *', async () => {
    console.log('\n🕒 [CRON] Déclenchement scan automatique');
    console.log(`🗓️  Date : ${new Date().toLocaleString('fr-FR')}\n`);

    try {
      const result = await brandFinder.runDailyScan();

      if (result.success) {
        console.log('\n✅ [CRON] Scan réussi');
        console.log(`   ASIN analysés: ${result.summary.asins}`);
        console.log(`   Marques trouvées: ${result.summary.brands}`);
        console.log(`   Tokens restants: ${result.summary.tokensRemaining}\n`);
      } else {
        console.error('\n❌ [CRON] Scan échoué:', result.error, '\n');
      }
    } catch (error) {
      console.error('\n❌ [CRON] Erreur critique:', error.message, '\n');
    }
  }, {
    timezone: 'Europe/Paris'
  });

  console.log('✅ CRON Job activé\n');
}

// Test manuel (décommenter pour tester immédiatement)
// (async () => {
//   console.log('🧪 TEST MANUEL DU SCAN\n');
//   const result = await brandFinder.runDailyScan();
//   console.log('\n📊 Résultat:', result);
// })();

module.exports = { startDailyScan };
