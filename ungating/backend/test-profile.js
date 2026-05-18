const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('🧪 Test Chrome Profile Access\n');

  try {
    console.log('📂 Tentative ouverture Chrome avec profil utilisateur...');

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      userDataDir: 'C:\\Users\\desty\\AppData\\Local\\Google\\Chrome\\User Data',
      args: [
        '--profile-directory=Default',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    console.log('✅ Chrome lancé avec succès!');

    const pages = await browser.pages();
    console.log(`📋 ${pages.length} pages ouvertes`);

    const page = pages[0] || await browser.newPage();
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    console.log('✅ Navigation Google OK');
    console.log('\n⏸️ Chrome reste ouvert - Appuie sur Ctrl+C pour fermer');

    await new Promise(() => {}); // Garde ouvert indéfiniment

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
})();
