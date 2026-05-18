const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('🚀 Lancement debug FNAC Pro...');

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

  // Test 1: Page beauté
  console.log('\n📦 Test 1: Page Beauté');
  const url = 'https://www.fnacpro.com/Tous-les-bons-plans-Beaute-Sante-Forme/Bons-plans-Beaute-Sante-Forme/nsh530301/w-4';
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Vérifier si bloqué
  const isBlocked = await page.evaluate(() => {
    return document.body.innerText.includes('Accès temporairement restreint');
  });

  if (isBlocked) {
    console.log('❌ FNAC Pro bloque encore (Accès restreint)');
    await page.screenshot({ path: 'fnac-blocked.png', fullPage: true });
    await browser.close();
    return;
  }

  console.log('✅ Page chargée sans blocage !');

  // Screenshot
  await page.screenshot({ path: 'fnac-page.png', fullPage: true });
  console.log('📸 Screenshot sauvegardé : fnac-page.png');

  // Sauvegarder le HTML complet
  const html = await page.content();
  fs.writeFileSync('fnac-page.html', html);
  console.log('💾 HTML sauvegardé : fnac-page.html');

  // Explorer la structure des produits
  console.log('\n🔍 Analyse de la structure...');

  const structure = await page.evaluate(() => {
    const results = {
      possibleProductContainers: [],
      possiblePrices: [],
      possibleBrands: [],
      possibleEANs: [],
      allClasses: new Set(),
    };

    // Chercher tous les éléments avec des classes
    const allElements = document.querySelectorAll('*[class]');
    allElements.forEach(el => {
      const classes = el.className.toString().split(' ');
      classes.forEach(c => {
        if (c && !c.includes('glyphicon') && !c.includes('icon')) {
          results.allClasses.add(c);
        }
      });
    });

    // Chercher des prix (pattern: nombre + €)
    const priceRegex = /\d+[,\.]\d+\s*€/;
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && priceRegex.test(el.innerText)) {
        results.possiblePrices.push({
          text: el.innerText.trim(),
          tag: el.tagName,
          class: el.className,
          parent: el.parentElement?.className || ''
        });
      }
    });

    // Chercher des EAN (13 chiffres)
    const eanRegex = /\b\d{13}\b/;
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && eanRegex.test(el.innerText)) {
        results.possibleEANs.push({
          text: el.innerText.trim(),
          tag: el.tagName,
          class: el.className,
          parent: el.parentElement?.className || ''
        });
      }
    });

    // Chercher des marques (texte court en majuscules)
    document.querySelectorAll('*').forEach(el => {
      const text = el.innerText?.trim();
      if (el.children.length === 0 && text && text.length < 30 && text === text.toUpperCase()) {
        results.possibleBrands.push({
          text: text,
          tag: el.tagName,
          class: el.className,
          parent: el.parentElement?.className || ''
        });
      }
    });

    results.allClasses = Array.from(results.allClasses);
    return results;
  });

  console.log('\n📊 Résultats de l\'analyse:');
  console.log(`   Classes trouvées: ${structure.allClasses.length}`);
  console.log(`   Prix détectés: ${structure.possiblePrices.length}`);
  console.log(`   EANs détectés: ${structure.possibleEANs.length}`);
  console.log(`   Marques détectées: ${structure.possibleBrands.length}`);

  // Sauvegarder l'analyse
  fs.writeFileSync('fnac-structure.json', JSON.stringify(structure, null, 2));
  console.log('\n💾 Analyse sauvegardée : fnac-structure.json');

  console.log('\n✅ Debug terminé ! Analyse des fichiers pour trouver les sélecteurs...');

  // Garder le navigateur ouvert pour inspection manuelle
  console.log('\n⏳ Navigateur ouvert pour inspection. Appuyez sur Ctrl+C pour fermer.');

  // Ne pas fermer automatiquement
  // await browser.close();
})();
