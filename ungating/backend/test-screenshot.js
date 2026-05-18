const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('🧪 Test avec screenshot\n');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: 'C:\\Users\\desty\\AppData\\Local\\puppeteer-oa',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );

  try {
    console.log('📦 Navigation FNAC Pro...');
    await page.goto('https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&sft=1', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ Attente 5 secondes...');
    await page.waitForTimeout(5000);

    // Screenshot
    await page.screenshot({ path: 'fnac-page.png', fullPage: true });
    console.log('📸 Screenshot: fnac-page.png');

    // Analyser ce qu'on voit
    const info = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500),
        nbProduits: document.querySelectorAll('a.Article-title').length,
        nbCheckboxes: document.querySelectorAll('input[type="checkbox"]').length,
        nbLabels: document.querySelectorAll('label').length,
      };
    });

    console.log('\n📊 Info page:');
    console.log(`   URL: ${info.url}`);
    console.log(`   Titre: ${info.title}`);
    console.log(`   Produits: ${info.nbProduits}`);
    console.log(`   Checkboxes: ${info.nbCheckboxes}`);
    console.log(`   Labels: ${info.nbLabels}`);
    console.log(`\n   Premier texte:`);
    console.log(info.bodyText);

    console.log('\n✅ Chrome reste ouvert - regarde le screenshot fnac-page.png');
    console.log('   Appuie sur Ctrl+C pour fermer\n');

    await new Promise(() => {}); // Garde ouvert

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    await browser.close();
  }
})();
