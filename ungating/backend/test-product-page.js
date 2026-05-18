process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '../.env' });

const { chromium } = require('playwright');

async function testProductPage() {
  console.log('🧪 TEST EXTRACTION PAGE PRODUIT\n');

  const context = await chromium.launchPersistentContext(
    'C:\\Users\\desty\\AppData\\Local\\puppeteer-oa',
    {
      headless: false,
      channel: 'chrome',
      args: ['--no-sandbox', '--lang=fr-FR'],
      locale: 'fr-FR',
    }
  );

  const page = await context.newPage();

  // URL d'un produit de test (le Puzzle Assassin's Creed visible dans la capture)
  const testUrl = 'https://www.fnacpro.com/a8817086/Puzzle-1000-pieces-Assassin-s-Creed-Black-Flag-Resistance-Pack-Puzzle';

  console.log(`📦 Navigation vers: ${testUrl}\n`);
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('⏳ Attente du chargement complet...\n');
  // Attendre que le prix soit visible (indique que la page est chargée)
  await page.waitForSelector('.ProductSummary-price', { timeout: 30000 }).catch(() => {
    console.log('⚠️  Timeout en attendant le prix');
  });
  await page.waitForTimeout(2000);

  console.log('🔍 Extraction des données...\n');

  const data = await page.evaluate(() => {
    // Prix
    const priceElement = document.querySelector('.ProductSummary-price');
    console.log('Prix element:', priceElement?.innerHTML);
    let price = null;
    if (priceElement) {
      const priceText = priceElement.innerText.replace(/[^\d,]/g, '').replace(',', '.');
      price = parseFloat(priceText);
    }

    // EAN
    const eanElement = Array.from(document.querySelectorAll('.ProductInfo dt')).find(
      dt => dt.innerText.trim() === 'EAN'
    );
    const ean = eanElement?.nextElementSibling?.innerText.trim();
    console.log('EAN element:', eanElement?.nextElementSibling?.innerHTML);

    // Marque
    const brandElement = document.querySelector('.ProductInfo-brand');
    const brand = brandElement?.innerText.trim();

    // Titre
    const title = document.querySelector('.ProductSummary-title')?.innerText.trim();

    return { price, ean, brand, title, url: window.location.href };
  });

  console.log('📊 RÉSULTAT:');
  console.log(`   Titre: ${data.title || '❌ NON TROUVÉ'}`);
  console.log(`   Marque: ${data.brand || '❌ NON TROUVÉ'}`);
  console.log(`   Prix: ${data.price || '❌ NON TROUVÉ'}€`);
  console.log(`   EAN: ${data.ean || '❌ NON TROUVÉ'}`);
  console.log(`   URL: ${data.url}\n`);

  if (!data.price || !data.ean) {
    console.log('⚠️  PROBLÈME: Prix ou EAN manquant!');
    console.log('Je vais prendre un screenshot pour debug...\n');
    await page.screenshot({ path: 'debug-product-page.png', fullPage: true });
    console.log('📸 Screenshot sauvegardé: debug-product-page.png');
  } else {
    console.log('✅ Extraction réussie!');
  }

  console.log('\n⏸️  Chrome reste ouvert - inspecte la page et ferme quand tu veux');
}

testProductPage().catch(console.error);
