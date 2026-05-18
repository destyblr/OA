require('dotenv').config({ path: '../.env' });
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('🧪 TEST COMPLET - SCRAPING FNAC PRO\n');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: 'C:\\Users\\desty\\AppData\\Local\\Temp\\puppeteer-profile',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );

  try {
    // ÉTAPE 1: Aller sur FNAC Pro
    console.log('📦 ÉTAPE 1: Navigation vers FNAC Pro...');
    const url = 'https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&sft=1';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);
    console.log('   ✓ Page chargée\n');

    // ÉTAPE 2: Vérifier si bloqué
    console.log('📦 ÉTAPE 2: Vérification blocage...');
    const isBlocked = await page.evaluate(() => {
      return document.body.innerText.includes('Accès temporairement restreint');
    });
    if (isBlocked) {
      console.log('   ❌ FNAC Pro bloque le bot!\n');
      await browser.close();
      return;
    }
    console.log('   ✓ Pas de blocage\n');

    // ÉTAPE 3: Compter les sélecteurs
    console.log('📦 ÉTAPE 3: Test des sélecteurs...');
    const selectors = await page.evaluate(() => {
      return {
        'a.Article-title': document.querySelectorAll('a.Article-title').length,
        '.Article-title': document.querySelectorAll('.Article-title').length,
        '.userPrice': document.querySelectorAll('.userPrice').length,
        '.articleList': document.querySelectorAll('.articleList').length,
        '.articleList > li': document.querySelectorAll('.articleList > li').length,
        'article': document.querySelectorAll('article').length,
        'li': document.querySelectorAll('li').length,
      };
    });
    console.log('   Sélecteurs trouvés:');
    Object.entries(selectors).forEach(([sel, count]) => {
      console.log(`      ${sel}: ${count}`);
    });
    console.log('');

    // ÉTAPE 4: Extraire les 3 premiers produits avec le sélecteur a.Article-title
    console.log('📦 ÉTAPE 4: Extraction des 3 premiers produits...');
    const products = await page.evaluate(() => {
      const results = [];
      const productLinks = document.querySelectorAll('a.Article-title');

      for (let i = 0; i < Math.min(3, productLinks.length); i++) {
        const linkEl = productLinks[i];

        const title = linkEl.innerText.trim();
        const url = linkEl.href;

        // Chercher le prix dans le parent
        let priceEl = linkEl.closest('li')?.querySelector('.userPrice');
        if (!priceEl) {
          priceEl = linkEl.closest('article')?.querySelector('.userPrice');
        }
        if (!priceEl) {
          priceEl = linkEl.closest('div')?.querySelector('.userPrice');
        }

        let price = null;
        if (priceEl) {
          const priceText = priceEl.innerText.replace(/[^\d,\.]/g, '').replace(',', '.');
          price = parseFloat(priceText);
        }

        results.push({ title, url, price, hasPriceEl: !!priceEl });
      }

      return results;
    });

    console.log('   Produits extraits:');
    products.forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.title.substring(0, 50)}...`);
      console.log(`         Prix: ${p.price || 'NON TROUVÉ'} (Element prix: ${p.hasPriceEl ? 'OUI' : 'NON'})`);
      console.log(`         URL: ${p.url}`);
    });
    console.log('');

    // ÉTAPE 5: Test récupération EAN sur 1 produit
    if (products.length > 0 && products[0].url) {
      console.log('📦 ÉTAPE 5: Test récupération EAN...');
      console.log(`   Visite de: ${products[0].url}`);

      await page.goto(products[0].url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);

      const ean = await page.evaluate(() => {
        const allText = document.body.innerText;

        // Pattern: EAN suivi de 13 chiffres
        const eanMatch = allText.match(/EAN[:\s]*(\d{13})/i);
        if (eanMatch) return { ean: eanMatch[1], found: 'EAN pattern' };

        // Pattern: Référence
        const refMatch = allText.match(/R[ée]f[ée]rence[:\s]*(\d{13})/i);
        if (refMatch) return { ean: refMatch[1], found: 'Référence pattern' };

        // Chercher juste 13 chiffres
        const match = allText.match(/\b(\d{13})\b/);
        if (match) return { ean: match[1], found: '13 digits' };

        return { ean: null, found: 'not found' };
      });

      console.log(`   EAN: ${ean.ean || 'NON TROUVÉ'} (méthode: ${ean.found})`);
      console.log('');
    }

    console.log('✅ TEST TERMINÉ - Navigateur reste ouvert pour inspection');
    console.log('   Appuyez sur Ctrl+C pour fermer\n');

  } catch (err) {
    console.error('❌ ERREUR:', err.message);
    console.error(err.stack);
    await browser.close();
  }
})();
