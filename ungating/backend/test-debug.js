const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('🔍 TEST DEBUG - ÉTAPE PAR ÉTAPE\n');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: 'C:\\Users\\desty\\AppData\\Local\\Temp\\puppeteer-profile',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    // ÉTAPE 1: Aller sur FNAC
    console.log('📦 ÉTAPE 1: Navigation FNAC Pro...');
    await page.goto('https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&sft=1', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    // Screenshot AVANT filtres
    await page.screenshot({ path: '1-avant-filtres.png', fullPage: true });
    console.log('   📸 Screenshot: 1-avant-filtres.png');

    // Analyser la page AVANT
    const avant = await page.evaluate(() => {
      const produits = Array.from(document.querySelectorAll('a.Article-title')).slice(0, 5).map(a => ({
        titre: a.innerText.trim().substring(0, 50),
        url: a.href
      }));

      const prix = Array.from(document.querySelectorAll('.userPrice')).slice(0, 5).map(p => p.innerText);

      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const labels = Array.from(document.querySelectorAll('label')).slice(0, 20).map(l => l.innerText.trim());

      return {
        nbProduits: document.querySelectorAll('a.Article-title').length,
        produits,
        prix,
        nbCheckboxes: checkboxes.length,
        checkboxesCochees: checkboxes.filter(cb => cb.checked).length,
        labels: labels.filter(l => l && l.includes('€'))
      };
    });

    console.log('\n   📊 AVANT FILTRES:');
    console.log(`      - ${avant.nbProduits} produits`);
    console.log(`      - ${avant.nbCheckboxes} checkboxes (${avant.checkboxesCochees} cochées)`);
    console.log(`\n      Premiers produits:`);
    avant.produits.forEach((p, i) => {
      console.log(`         ${i+1}. ${p.titre}... - Prix: ${avant.prix[i] || 'N/A'}`);
    });
    console.log(`\n      Labels prix trouvés:`);
    avant.labels.forEach(l => console.log(`         - ${l}`));

    // ÉTAPE 2: Appliquer filtres
    console.log('\n📦 ÉTAPE 2: Application filtres prix...');

    const filtresAppliques = await page.evaluate(() => {
      const results = [];
      const filtersToCheck = ['<10€', 'De 10 à 20€'];

      filtersToCheck.forEach(filterText => {
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find(l => l.innerText.trim() === filterText);

        if (label) {
          const checkbox = label.querySelector('input[type="checkbox"]');
          if (checkbox) {
            const wasChecked = checkbox.checked;
            if (!wasChecked) {
              checkbox.click();
              results.push({ filter: filterText, clicked: true, found: true });
            } else {
              results.push({ filter: filterText, clicked: false, found: true, alreadyChecked: true });
            }
          } else {
            results.push({ filter: filterText, clicked: false, found: true, noCheckbox: true });
          }
        } else {
          results.push({ filter: filterText, clicked: false, found: false });
        }
      });

      return results;
    });

    console.log('   Résultats:');
    filtresAppliques.forEach(r => {
      console.log(`      ${r.filter}: ${r.clicked ? '✓ CLIQUÉ' : r.found ? (r.alreadyChecked ? '↻ Déjà coché' : '✗ Pas cliqué') : '✗ Pas trouvé'}`);
    });

    // Attendre reload
    console.log('\n   ⏳ Attente reload (5 sec)...');
    await page.waitForTimeout(5000);

    // Screenshot APRÈS filtres
    await page.screenshot({ path: '2-apres-filtres.png', fullPage: true });
    console.log('   📸 Screenshot: 2-apres-filtres.png');

    // Analyser la page APRÈS
    const apres = await page.evaluate(() => {
      const produits = Array.from(document.querySelectorAll('a.Article-title')).slice(0, 5).map(a => ({
        titre: a.innerText.trim().substring(0, 50),
      }));

      const prix = Array.from(document.querySelectorAll('.userPrice')).slice(0, 5).map(p => p.innerText);

      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));

      return {
        nbProduits: document.querySelectorAll('a.Article-title').length,
        produits,
        prix,
        checkboxesCochees: checkboxes.filter(cb => cb.checked).length,
        url: window.location.href
      };
    });

    console.log('\n   📊 APRÈS FILTRES:');
    console.log(`      - ${apres.nbProduits} produits`);
    console.log(`      - ${apres.checkboxesCochees} checkboxes cochées`);
    console.log(`      - URL: ${apres.url}`);
    console.log(`\n      Premiers produits:`);
    apres.produits.forEach((p, i) => {
      console.log(`         ${i+1}. ${p.titre}... - Prix: ${apres.prix[i] || 'N/A'}`);
    });

    // Comparaison
    console.log('\n📊 COMPARAISON:');
    console.log(`   Nombre de produits: ${avant.nbProduits} → ${apres.nbProduits}`);
    console.log(`   Même premier produit? ${avant.produits[0]?.titre === apres.produits[0]?.titre ? 'OUI (filtres pas appliqués!)' : 'NON (filtres OK)'}`);

    console.log('\n✅ Test terminé - Chrome reste ouvert pour inspection');
    console.log('   Regarde les screenshots: 1-avant-filtres.png et 2-apres-filtres.png\n');

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    await browser.close();
  }
})();
