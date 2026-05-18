const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('🔍 ANALYSE DES FILTRES PRIX FNAC\n');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: 'C:\\Users\\desty\\AppData\\Local\\puppeteer-oa',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    console.log('📦 Navigation FNAC Pro...');
    await page.goto('https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&sft=1', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Accepter cookies
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText.includes('Accepter')
      );
      if (btn) btn.click();
    });

    await page.waitForTimeout(2000);

    // Analyser TOUS les labels de la page
    const allFilters = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));

      return labels.map((label, index) => ({
        index,
        text: label.innerText.trim(),
        hasCheckbox: !!label.querySelector('input[type="checkbox"]'),
        checkboxId: label.querySelector('input[type="checkbox"]')?.id || null,
        parentText: label.parentElement?.innerText?.substring(0, 100) || ''
      })).filter(l => l.text); // Seulement les non-vides
    });

    console.log(`\n📊 ${allFilters.length} labels trouvés:\n`);

    // Filtrer ceux qui contiennent "€" ou "prix" ou des chiffres
    const priceFilters = allFilters.filter(f =>
      f.text.includes('€') ||
      f.text.toLowerCase().includes('prix') ||
      /\d+/.test(f.text)
    );

    console.log('💶 Filtres prix potentiels:\n');
    priceFilters.forEach(f => {
      console.log(`   [${f.index}] "${f.text}" ${f.hasCheckbox ? '✅ checkbox' : '❌ no checkbox'}`);
    });

    // Screenshot pour vérifier visuellement
    await page.screenshot({ path: 'filters-debug.png', fullPage: true });
    console.log('\n📸 Screenshot: filters-debug.png');

    console.log('\n✅ Analyse terminée - Chrome reste ouvert');
    console.log('   Appuie sur Ctrl+C pour fermer\n');

    await new Promise(() => {});

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    await browser.close();
  }
})();
