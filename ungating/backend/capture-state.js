const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('📸 CAPTURE ÉTAT PAGE FNAC\n');

  // Se connecter au Chrome déjà ouvert
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
  }).catch(() => null);

  if (!browser) {
    console.log('❌ Impossible de se connecter au Chrome. Il faut le lancer avec --remote-debugging-port=9222');
    console.log('Ou attends que le test continue...\n');
    process.exit(0);
  }

  const pages = await browser.pages();
  console.log(`📋 ${pages.length} onglets ouverts\n`);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const url = page.url();
    const title = await page.title();

    console.log(`\n📄 Onglet ${i + 1}:`);
    console.log(`   Titre: ${title}`);
    console.log(`   URL: ${url.substring(0, 80)}...`);

    if (url.includes('fnacpro.com')) {
      console.log(`\n   🔍 Analyse de la page FNAC...`);

      // Capturer état des filtres
      const filterState = await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const checkedFilters = checkboxes
          .filter(cb => cb.checked)
          .map(cb => {
            const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
            return label ? label.innerText.trim() : cb.id;
          });

        // Compter produits visibles
        const products = document.querySelectorAll('a.Article-title').length;

        // Vérifier si filtres visibles
        const filterSection = document.querySelector('[class*="filter"], [class*="Filter"]');
        const hasFilters = !!filterSection;

        // Premier prix visible
        const firstPrice = document.querySelector('.userPrice, [class*="price"]')?.innerText;

        return {
          checkedFilters,
          totalCheckboxes: checkboxes.length,
          productsVisible: products,
          hasFilters,
          firstPrice,
          url: window.location.href
        };
      });

      console.log(`\n   📊 État:`)
      console.log(`      - Checkboxes totales: ${filterState.totalCheckboxes}`);
      console.log(`      - Filtres cochés: ${filterState.checkedFilters.length}`);
      if (filterState.checkedFilters.length > 0) {
        filterState.checkedFilters.forEach(f => console.log(`         ✓ ${f}`));
      }
      console.log(`      - Produits visibles: ${filterState.productsVisible}`);
      console.log(`      - Section filtres présente: ${filterState.hasFilters ? 'OUI' : 'NON'}`);
      console.log(`      - Premier prix: ${filterState.firstPrice || 'Non trouvé'}`);
      console.log(`      - URL: ${filterState.url}`);

      // Screenshot
      await page.screenshot({ path: 'fnac-current-state.png', fullPage: false });
      console.log(`\n   📸 Screenshot sauvegardé: fnac-current-state.png`);
    }
  }

  console.log('\n✅ Capture terminée\n');
  await browser.disconnect();
})();
