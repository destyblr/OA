const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: 'C:\\Users\\desty\\AppData\\Local\\puppeteer-oa',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  await page.goto('https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&sft=1', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('⏳ Attente 8 secondes...');
  await page.waitForTimeout(8000);

  const nbProduits = await page.evaluate(() => {
    return document.querySelectorAll('a.Article-title').length;
  });

  console.log(`\n📊 Produits trouvés: ${nbProduits}`);

  if (nbProduits > 0) {
    console.log('✅ Sélecteur OK!');
  } else {
    console.log('❌ Sélecteur ne fonctionne pas');

    // Essayer d'autres sélecteurs
    const alternatives = await page.evaluate(() => {
      return {
        articles: document.querySelectorAll('article').length,
        productCards: document.querySelectorAll('[class*="Article"]').length,
        links: document.querySelectorAll('a[href*="Product"]').length,
      };
    });
    console.log('Alternatives:', alternatives);
  }

  console.log('\n✅ Chrome reste ouvert\n');
  await new Promise(() => {});
})();
