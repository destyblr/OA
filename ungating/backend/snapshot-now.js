const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  try {
    // Se connecter au profil Puppeteer existant
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      userDataDir: 'C:\\Users\\desty\\AppData\\Local\\Temp\\puppeteer-profile',
      args: ['--no-sandbox'],
    });

    const pages = await browser.pages();
    console.log(`\n📋 ${pages.length} onglets trouvés\n`);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const url = page.url();
      const title = await page.title();

      console.log(`Onglet ${i}: ${title}`);
      console.log(`URL: ${url}\n`);

      // Screenshot de chaque onglet
      await page.screenshot({
        path: `onglet-${i}.png`,
        fullPage: true
      });
      console.log(`📸 Screenshot: onglet-${i}.png\n`);

      // Si c'est FNAC, extraire plus d'infos
      if (url.includes('fnacpro')) {
        const info = await page.evaluate(() => {
          return {
            nbCheckboxes: document.querySelectorAll('input[type="checkbox"]:checked').length,
            nbProduits: document.querySelectorAll('a.Article-title').length,
            premierPrix: document.querySelector('.userPrice')?.innerText,
          };
        });
        console.log(`   Checkboxes cochées: ${info.nbCheckboxes}`);
        console.log(`   Produits affichés: ${info.nbProduits}`);
        console.log(`   Premier prix: ${info.premierPrix}\n`);
      }
    }

    console.log('✅ Capture terminée\n');
    await browser.close();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
})();
