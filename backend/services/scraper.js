const puppeteer = require('puppeteer');
const categoryMapping = require('../config/fnac-categories');

/**
 * SCRAPER MODULE - FNAC Pro → Seller Central
 *
 * Workflow:
 * 1. Scrape FNAC Pro (marque, prix TTC, EAN, URL)
 * 2. Check restrictions Seller Central avec EAN (pas besoin d'Amazon)
 * 3. Extract données (BRAND/CATEGORY, unités)
 */

class Scraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser session (headless: false = session normale pour éviter CAPTCHA)
   */
  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false, // Mode visible = plus humain, moins de CAPTCHA
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      this.page = await this.browser.newPage();

      // User agent réaliste
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Supprimer les détections de bot
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
      });
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * ÉTAPE 1 : Scrape FNAC Pro
   *
   * @param {number} maxPrice - Prix maximum unitaire (ex: 12)
   * @param {string[]} categories - Liste des IDs de catégories (ex: ["toys", "beauty"])
   * @param {function} progressCallback - Callback pour mise à jour progression
   * @returns {Promise<Array>} Liste de produits avec {brand, title, price, ean, url}
   */
  async scrapeFnacPro(maxPrice, categories, progressCallback = () => {}) {
    console.log(`🔍 Scraping FNAC Pro (max: ${maxPrice}€, cats: ${categories.join(', ')})`);

    await this.init();

    const allProducts = [];

    for (let i = 0; i < categories.length; i++) {
      const catId = categories[i];
      const catConfig = categoryMapping[catId];

      if (!catConfig) {
        console.warn(`⚠️ Catégorie inconnue: ${catId}`);
        continue;
      }

      console.log(`\n📦 Scraping catégorie: ${catConfig.label}`);

      // Navigate to category page
      await this.navigateToCategory(catConfig);

      // Apply price filters
      await this.applyPriceFilters(maxPrice);

      // Scrape all products (with pagination/scroll)
      const products = await this.scrapeProductsFromPage();

      console.log(`   ✅ ${products.length} produits trouvés`);
      allProducts.push(...products);

      // Progress callback
      progressCallback({
        stage: 'fnac',
        category: catConfig.label,
        categoryIndex: i + 1,
        totalCategories: categories.length,
        productsFound: allProducts.length,
      });

      // Délai humain entre catégories
      await this.humanDelay(2000, 4000);
    }

    console.log(`\n✅ Total FNAC Pro: ${allProducts.length} produits`);
    return allProducts;
  }

  /**
   * Navigate to category page (search or direct URL)
   */
  async navigateToCategory(catConfig) {
    if (catConfig.type === 'search') {
      // Type 1: Recherche par mot-clé
      const searchUrl = `https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=${encodeURIComponent(catConfig.keyword)}&sft=1`;
      console.log(`   🔗 Recherche: ${searchUrl}`);
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    } else if (catConfig.type === 'url') {
      // Type 2: URL directe
      console.log(`   🔗 URL directe: ${catConfig.url}`);
      await this.page.goto(catConfig.url, { waitUntil: 'networkidle2', timeout: 60000 });
    }

    // Attendre chargement de la page
    await this.page.waitForTimeout(2000);

    // Détecter CAPTCHA
    await this.checkForCaptcha();
  }

  /**
   * Check for CAPTCHA and pause if detected
   */
  async checkForCaptcha() {
    const captchaDetected = await this.page.evaluate(() => {
      return document.body.innerText.includes("On s'assure qu'on s'adresse bien à vous");
    });

    if (captchaDetected) {
      console.log('\n⚠️  CAPTCHA DÉTECTÉ !');
      console.log('👉 Résolvez le CAPTCHA manuellement dans le navigateur...');
      console.log('⏳ En attente (max 2 minutes)...\n');

      // Attendre que le CAPTCHA soit résolu (max 2 min)
      try {
        await this.page.waitForNavigation({ timeout: 120000 });
        console.log('✅ CAPTCHA résolu, continuation...\n');
      } catch (e) {
        throw new Error('CAPTCHA non résolu après 2 minutes. Abandon du scan.');
      }
    }
  }

  /**
   * Apply price filters based on maxPrice
   */
  async applyPriceFilters(maxPrice) {
    console.log(`   💶 Application filtre prix: ≤${maxPrice}€`);

    // Les filtres FNAC Pro sont dans le menu latéral "FILTRER"
    // On doit cliquer sur les checkboxes correspondantes

    try {
      // Attendre que les filtres soient chargés
      await this.page.waitForSelector('.filtrer, #filtres, [class*="filter"]', { timeout: 5000 });

      // Stratégie: Cliquer sur les filtres de prix qui couvrent [0, maxPrice]
      // Exemples de filtres: "<10€", "De 10 à 20€", etc.

      if (maxPrice >= 10) {
        // Cliquer sur "<10€"
        await this.clickPriceFilter('<10');
      }

      if (maxPrice > 10 && maxPrice <= 20) {
        // Cliquer sur "De 10 à 20€"
        await this.clickPriceFilter('10', '20');
      }

      // Attendre que les résultats se rechargent
      await this.page.waitForTimeout(2000);
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

    } catch (e) {
      console.warn(`   ⚠️ Impossible d'appliquer les filtres prix: ${e.message}`);
    }
  }

  /**
   * Click on price filter checkbox
   */
  async clickPriceFilter(min, max = null) {
    try {
      const filterText = max ? `De ${min} à ${max}€` : `<${min}€`;

      // Chercher le filtre dans la page
      const clicked = await this.page.evaluate((text) => {
        const filters = Array.from(document.querySelectorAll('.filter-item, .filtre-actif, [class*="filter"]'));
        const filter = filters.find(f => f.innerText.includes(text));
        if (filter) {
          filter.click();
          return true;
        }
        return false;
      }, filterText);

      if (clicked) {
        console.log(`      ✓ Filtre appliqué: ${filterText}`);
      }
    } catch (e) {
      console.warn(`      ⚠️ Filtre non trouvé: ${e.message}`);
    }
  }

  /**
   * Scrape all products from current page (with pagination/scroll)
   */
  async scrapeProductsFromPage() {
    const products = [];
    let previousHeight = 0;
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 10;

    console.log('   📜 Scroll pour charger tous les produits...');

    // Scroll infini pour charger tous les produits
    while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
      // Scroll vers le bas
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(1500);

      // Vérifier si de nouveaux produits ont été chargés
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === previousHeight) {
        // Plus de nouveaux produits, on arrête
        break;
      }

      previousHeight = currentHeight;
      scrollAttempts++;
    }

    console.log(`   📦 Extraction des données produits...`);

    // Extraire tous les produits de la page
    const extractedProducts = await this.page.evaluate(() => {
      const products = [];

      // Sélecteurs pour les produits (à ajuster selon la structure HTML réelle)
      const productElements = document.querySelectorAll('[class*="product"], [class*="item"], article');

      productElements.forEach((el) => {
        try {
          // Marque
          const brandEl = el.querySelector('[class*="brand"], [class*="marque"], .manufacturer');
          const brand = brandEl ? brandEl.innerText.trim() : null;

          // Titre
          const titleEl = el.querySelector('h2, h3, [class*="title"], [class*="name"]');
          const title = titleEl ? titleEl.innerText.trim() : null;

          // Prix TTC
          const priceEl = el.querySelector('[class*="price"], .prix, [class*="amount"]');
          let price = null;
          if (priceEl) {
            const priceText = priceEl.innerText.replace(/[^\d,\.]/g, '').replace(',', '.');
            price = parseFloat(priceText);
          }

          // EAN (peut être dans les détails techniques ou caché)
          let ean = null;
          const detailsEl = el.querySelector('[class*="details"], [class*="specs"], [class*="technical"]');
          if (detailsEl && detailsEl.innerText.includes('EAN')) {
            const eanMatch = detailsEl.innerText.match(/EAN[\s:]*(\d{13})/);
            if (eanMatch) ean = eanMatch[1];
          }

          // URL du produit
          const linkEl = el.querySelector('a[href*="/a"], a[href*="/product"]');
          const url = linkEl ? linkEl.href : null;

          // Ne garder que les produits avec prix et URL minimum
          if (price && url) {
            products.push({ brand, title, price, ean, url });
          }
        } catch (err) {
          // Skip ce produit si erreur
        }
      });

      return products;
    });

    console.log(`      ✓ ${extractedProducts.length} produits extraits`);

    // Filtrer les produits sans EAN (on en aura besoin pour Seller Central)
    const productsWithEAN = extractedProducts.filter(p => p.ean);
    console.log(`      ✓ ${productsWithEAN.length} produits avec EAN`);

    return productsWithEAN;
  }

  /**
   * ÉTAPE 2 : Check restrictions Seller Central avec EAN
   *
   * @param {Array} products - Liste de produits avec EAN
   * @param {function} progressCallback - Callback pour progression
   * @returns {Promise<Array>} Produits restreints avec {units, approvalText, type}
   */
  async checkRestrictions(products, progressCallback = () => {}) {
    console.log(`\n🔒 Checking ${products.length} produits sur Seller Central`);

    await this.init();

    const restrictedProducts = [];

    // Navigate to Seller Central (une seule fois)
    console.log('🔑 Connexion à Seller Central...');
    await this.page.goto('https://sellercentral.amazon.fr/product-search/product-ids', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Attendre connexion manuelle si nécessaire
    const isLoginPage = await this.page.evaluate(() => {
      return document.body.innerText.includes('Se connecter') || document.URL.includes('/ap/signin');
    });

    if (isLoginPage) {
      console.log('\n⚠️  CONNEXION SELLER CENTRAL REQUISE');
      console.log('👉 Connectez-vous manuellement dans le navigateur...');
      console.log('⏳ En attente (max 2 minutes)...\n');

      await this.page.waitForNavigation({ timeout: 120000 }).catch(() => {
        throw new Error('Connexion Seller Central non effectuée. Abandon.');
      });

      console.log('✅ Connecté à Seller Central\n');
    }

    // Check chaque produit
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        console.log(`   [${i + 1}/${products.length}] Checking EAN: ${product.ean}`);

        // Entrer l'EAN dans le champ de recherche
        await this.page.goto('https://sellercentral.amazon.fr/product-search/product-ids', {
          waitUntil: 'networkidle2',
        });

        await this.page.waitForSelector('input[name="asin"], input[type="text"]', { timeout: 5000 });
        await this.page.type('input[name="asin"], input[type="text"]', product.ean);
        await this.page.keyboard.press('Enter');

        // Attendre la page de résultat
        await this.page.waitForTimeout(2000);
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

        // Extraire les infos de restriction
        const restriction = await this.extractRestrictionInfo();

        if (restriction) {
          restrictedProducts.push({
            ...product,
            ...restriction,
          });
          console.log(`      ✓ RESTREINT: ${restriction.type} - ${restriction.units} unités`);
        } else {
          console.log(`      ○ Non restreint`);
        }

      } catch (err) {
        console.warn(`      ⚠️ Erreur: ${err.message}`);
      }

      // Progress callback
      progressCallback({
        stage: 'seller_central',
        checked: i + 1,
        total: products.length,
        restrictedFound: restrictedProducts.length,
      });

      // Délai humain entre requêtes
      await this.humanDelay(1000, 2000);
    }

    console.log(`\n✅ Restrictions trouvées: ${restrictedProducts.length}/${products.length}`);
    return restrictedProducts;
  }

  /**
   * Extract restriction info from Seller Central page
   */
  async extractRestrictionInfo() {
    return await this.page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Détecter si produit restreint
      const isRestricted = bodyText.includes('Demande d\'autorisation') ||
                           bodyText.includes('Une autorisation est nécessaire') ||
                           bodyText.includes('Approval required');

      if (!isRestricted) {
        return null; // Produit non restreint
      }

      // Extraire le type: BRAND ou CATEGORY
      let type = 'BRAND';
      let approvalText = '';

      // Pattern BRAND: "Marque {NOM}"
      const brandMatch = bodyText.match(/Marque\s+([^\s]+)/);
      if (brandMatch) {
        type = 'BRAND';
        approvalText = brandMatch[1];
      } else {
        // Si pas de "Marque", c'est une CATEGORY
        type = 'CATEGORY';

        // Chercher le nom de catégorie (Baby Products, Grocery, etc.)
        const categoryKeywords = [
          'Baby Products', 'Grocery', 'Health', 'Beauty',
          'Pet Supplies', 'Toys', 'Jewelry'
        ];

        for (const keyword of categoryKeywords) {
          if (bodyText.includes(keyword)) {
            approvalText = keyword;
            break;
          }
        }

        // Si pas trouvé, extraire du texte
        if (!approvalText) {
          const catMatch = bodyText.match(/autorisation de vendre\s+([^\n]+)/i);
          if (catMatch) approvalText = catMatch[1].trim();
        }
      }

      // Extraire le nombre d'unités
      let units = 1;
      const unitsMatch = bodyText.match(/au moins\s+(\d+)\s+unités/i);
      if (unitsMatch) {
        units = parseInt(unitsMatch[1]);
      }

      return {
        isRestricted: true,
        type,
        approvalText,
        units,
      };
    });
  }

  /**
   * Human-like delay (random between min and max ms)
   */
  async humanDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.page.waitForTimeout(delay);
  }
}

module.exports = new Scraper();
