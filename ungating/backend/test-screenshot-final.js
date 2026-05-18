const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
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

  console.log('📦 Navigation FNAC Pro...');
  await page.goto('https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&sft=1', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('⏳ Attente 5 secondes...');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'what-puppeteer-sees.png', fullPage: true });
  console.log('📸 Screenshot: what-puppeteer-sees.png');

  const info = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      hasArticleTitle: document.querySelectorAll('a.Article-title').length,
      bodyStart: document.body.innerText.substring(0, 500),
    };
  });

  console.log('\n📊 Ce que voit Puppeteer:');
  console.log('   URL:', info.url);
  console.log('   Titre:', info.title);
  console.log('   Produits (a.Article-title):', info.hasArticleTitle);
  console.log('\n   Texte page:');
  console.log(info.bodyStart);

  console.log('\n✅ Chrome reste ouvert - regarde what-puppeteer-sees.png\n');
  await new Promise(() => {});
})();
