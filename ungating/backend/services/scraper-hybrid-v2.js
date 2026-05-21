const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { chromium } = require('playwright');

const categoryMapping = require('../config/fnac-categories');
const supabase = require('../config/supabase');

/**
 * SCRAPER HYBRIDE V5 - PHASES SÉPARÉES
 *
 * Phase 1: Scraper FNAC complètement (Puppeteer)
 * Phase 2: Trouver ASIN sur Amazon (Puppeteer)
 * Phase 3: Vérifier Seller Central (Playwright)
 */
class ScraperHybridV2 {
  constructor() {
    this.puppeteerBrowser = null;
    this.playwrightContext = null;
  }

  async initPuppeteer() {
    if (!this.puppeteerBrowser) {
      this.puppeteerBrowser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: 'C:\\Users\\desty\\AppData\\Local\\puppeteer-oa',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--lang=fr-FR',
          '--accept-lang=fr-FR,fr'
        ],
      });
    }
  }

  async initPlaywright() {
    if (!this.playwrightContext) {
      const browser = await chromium.launchPersistentContext(
        'C:\\Users\\desty\\AppData\\Local\\playwright-oa-sc',
        {
          headless: false,
          args: ['--lang=fr-FR', '--accept-lang=fr-FR,fr'],
          locale: 'fr-FR',
          viewport: { width: 1280, height: 720 }
        }
      );
      this.playwrightContext = browser;
    }
  }

  async close() {
    if (this.puppeteerBrowser) {
      await this.puppeteerBrowser.close();
      this.puppeteerBrowser = null;
    }
    if (this.playwrightContext) {
      await this.playwrightContext.close();
      this.playwrightContext = null;
    }
  }

  /**
   * WORKFLOW PRINCIPAL - 3 PHASES SÉPARÉES
   */
  async runScan(scanId, maxPrice, categories, progressCallback = () => {}) {
    this.currentScanId = scanId; // Stocker pour saveOpportunity
    const allProducts = [];

    // ============================================
    // PHASE 1: SCRAPER FNAC PRO (TOUS LES PRODUITS)
    // ============================================
    console.log('\n🏪 PHASE 1: SCRAPING FNAC PRO\n');
    await this.initPuppeteer();

    for (const catId of categories) {
      const catConfig = categoryMapping[catId];
      if (!catConfig) continue;

      console.log(`📦 Catégorie: ${catConfig.label}`);

      const products = await this.scrapeFnacCategory(catConfig, maxPrice);
      allProducts.push(...products);

      console.log(`   ✓ ${products.length} produits extraits\n`);
    }

    console.log(`\n✅ PHASE 1 TERMINÉE: ${allProducts.length} produits totaux\n`);

    // Fermer Puppeteer avant Playwright
    await this.puppeteerBrowser.close();
    this.puppeteerBrowser = null;

    // ============================================
    // PHASE 2: VÉRIFIER SELLER CENTRAL (avec EAN direct)
    // ============================================
    console.log('\n🎯 PHASE 2: VÉRIFICATION SELLER CENTRAL\n');
    await this.initPlaywright();

    // Charger l'ancien scraper qui a la bonne fonction checkSellerCentralWithPlaywright
    const oldScraper = require('./scraper-hybrid');

    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      console.log(`[${i+1}/${allProducts.length}] EAN ${product.ean}`);

      try {
        // Utiliser la fonction de l'ancien scraper qui marche
        const restriction = await oldScraper.checkSellerCentralWithPlaywright(product.ean);

        if (restriction) {
          // MAINTENANT on sauvegarde le produit (après vérification Seller Central)
          console.log(`   💾 Sauvegarde produit en base...`);
          const savedProduct = await this.saveProduct(product);
          product.id = savedProduct.id; // Ajouter l'ID pour l'opportunity

          // Sauvegarder la restriction
          await this.saveRestriction(restriction);

          if (restriction.isRestricted) {
            console.log(`   ✓ RESTREINT: ${restriction.type} - ${restriction.approvalText}`);
            console.log(`   📦 ${restriction.units} unités requises`);

            // Créer l'opportunity (lien products ↔ restrictions)
            await this.saveOpportunity(product, restriction);
            console.log(`   💾 Opportunity créée`);
          } else {
            console.log(`   ✓ Non restreint`);
          }
        }
      } catch (err) {
        console.error(`   ❌ Erreur: ${err.message}`);
      }

      progressCallback({
        phase: 'seller_central',
        current: i + 1,
        total: allProducts.length
      });
    }

    console.log(`\n✅ PHASE 2 TERMINÉE\n`);

    await this.close();
    return allProducts.length;
  }

  /**
   * FILTRE MÉDIAS: Détecte et exclut livres, CD, DVD, magazines, revues
   */
  isMediaProduct(product) {
    const title = (product.title || '').toLowerCase();
    const brand = (product.brand || '').toLowerCase();
    const ean = product.ean || '';

    // 1. LIVRES: EAN commence par 978 ou 979 (ISBN)
    if (ean.startsWith('978') || ean.startsWith('979')) {
      return { isMedia: true, type: 'Livre', icon: '📚' };
    }

    // 2. CD / VINYLE / MUSIQUE
    const musicKeywords = [
      'cd ', ' cd', 'album', 'vinyle', 'vinyl', 'disque',
      'compilation', 'single', 'ep ', ' ep', 'soundtrack',
      'bande originale', 'best of', 'greatest hits'
    ];
    if (musicKeywords.some(kw => title.includes(kw))) {
      return { isMedia: true, type: 'CD/Musique', icon: '💿' };
    }

    // 3. DVD / BLU-RAY / FILM
    const videoKeywords = [
      'dvd', 'blu-ray', 'bluray', 'film', 'movie',
      'coffret', 'saison', 'season', 'série', 'series'
    ];
    if (videoKeywords.some(kw => title.includes(kw))) {
      return { isMedia: true, type: 'DVD/Vidéo', icon: '📀' };
    }

    // 4. MAGAZINES / REVUES / PRESSE
    const pressKeywords = [
      'magazine', 'revue', 'hors-série', 'hors serie',
      'mensuel', 'hebdo', 'quotidien', 'journal',
      'numéro', 'n°', 'édition spéciale'
    ];
    if (pressKeywords.some(kw => title.includes(kw) || brand.includes(kw))) {
      return { isMedia: true, type: 'Magazine/Presse', icon: '📰' };
    }

    // Marques connues de magazines
    const pressBrands = [
      'grazia', 'elle', 'marie claire', 'cosmopolitan',
      'vogue', 'gala', 'closer', 'voici', 'public',
      'l\'express', 'le point', 'paris match', 'telerama'
    ];
    if (pressBrands.some(b => brand.includes(b))) {
      return { isMedia: true, type: 'Magazine/Presse', icon: '📰' };
    }

    // 5. JEUX VIDÉO (optionnel - à activer si nécessaire)
    // const gameKeywords = ['playstation', 'xbox', 'nintendo', 'switch', 'ps4', 'ps5'];
    // if (gameKeywords.some(kw => title.includes(kw) || brand.includes(kw))) {
    //   return { isMedia: true, type: 'Jeu vidéo', icon: '🎮' };
    // }

    return { isMedia: false };
  }

  /**
   * PHASE 1: Scraper une catégorie FNAC complète
   */
  async scrapeFnacCategory(catConfig, maxPrice) {
    const page = await this.puppeteerBrowser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    const products = [];

    try {
      // Naviguer vers la catégorie
      if (catConfig.type === 'url') {
        await page.goto(catConfig.url, { waitUntil: 'networkidle2', timeout: 60000 });
      } else {
        await page.goto(`https://www.fnacpro.com/SearchResult/ResultList.aspx?Search=${catConfig.keyword}`, {
          waitUntil: 'networkidle2',
          timeout: 60000
        });
      }

      console.log(`   ⏸️  ATTENTE: Résous le CAPTCHA si nécessaire (30 secondes)...`);
      await page.waitForTimeout(30000); // 30 secondes pour le CAPTCHA

      // Appliquer filtres prix
      await this.applyPriceFilters(page, maxPrice);

      // Charger les EAN déjà en base (cache pour skip)
      console.log(`   📦 Chargement cache EAN existants...`);
      const existingEANs = await this.loadExistingEANs();
      console.log(`   ✓ ${existingEANs.size} EAN en cache`);

      // Extraire tous les produits
      const MIN_NEW_PRODUCTS = 20; // MINIMUM 20 nouveaux produits obligatoire
      const MAX_LOAD_MORE = 50; // Augmenté pour chercher plus loin
      let loadMoreClicks = 0;

      const processedUrls = new Set(); // URLs déjà vues
      let skipped = 0;

      while (products.length < MIN_NEW_PRODUCTS && loadMoreClicks < MAX_LOAD_MORE) {
        // Extraire liens visibles
        const productLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a.Article-title')).map(a => ({
            title: a.innerText.trim(),
            url: a.href
          }));
        });

        console.log(`   📋 ${productLinks.length} produits visibles | ${products.length} traités | ${skipped} skippés`);

        // Filtrer les liens pas encore vus
        const newLinks = productLinks.filter(link => !processedUrls.has(link.url));

        if (newLinks.length === 0) {
          console.log(`   ⚠️ Tous les produits déjà vus, clic "Voir plus"...`);
        }

        // Traiter chaque produit
        for (const link of newLinks) {
          if (products.length >= MIN_NEW_PRODUCTS) break;

          processedUrls.add(link.url); // Marquer comme vu
          console.log(`   → [${products.length + 1}] ${link.title.substring(0, 45)}...`);

          try {
            const productData = await this.getProductDetails(link.url);

            if (!productData) {
              console.log(`      ✗ Données manquantes`);
              continue;
            }

            // FILTRER LES MÉDIAS (livres, CD, DVD, magazines, revues)
            const mediaFilter = this.isMediaProduct(productData);
            if (mediaFilter.isMedia) {
              console.log(`      ${mediaFilter.icon} SKIP: ${mediaFilter.type} - ${productData.title.substring(0, 50)}`);
              skipped++;
              continue;
            }

            // VÉRIFIER SI EAN EXISTE DÉJÀ EN BASE
            if (existingEANs.has(productData.ean)) {
              console.log(`      ⏭️ SKIP: EAN ${productData.ean} déjà en base`);
              skipped++;
              continue;
            }

            // Nouveau produit → NE PAS SAUVEGARDER encore (attendre Seller Central)
            products.push(productData); // Juste garder en mémoire
            existingEANs.add(productData.ean); // Ajouter au cache temporaire
            console.log(`      ✅ ${productData.brand} - ${productData.price}€ (EAN: ${productData.ean}) [EN ATTENTE]`);

          } catch (err) {
            console.error(`      ✗ Erreur: ${err.message}`);
          }
        }

        // Vérifier si on a assez de nouveaux produits
        if (products.length >= MIN_NEW_PRODUCTS) {
          console.log(`   ✅ Objectif atteint: ${products.length} nouveaux produits`);
          break;
        }

        // Aller à la page suivante (via URL PageIndex)
        try {
          console.log(`   📄 Page ${loadMoreClicks + 2} | ${products.length}/${MIN_NEW_PRODUCTS} nouveaux produits...`);

          // Récupérer l'URL actuelle et incrémenter PageIndex
          const currentUrl = page.url();
          let nextPageUrl;

          if (currentUrl.includes('PageIndex=')) {
            // Incrémenter PageIndex existant
            nextPageUrl = currentUrl.replace(/PageIndex=(\d+)/, (match, p1) => `PageIndex=${parseInt(p1) + 1}`);
          } else {
            // Ajouter PageIndex=2 si absent
            nextPageUrl = `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}PageIndex=2`;
          }

          await page.goto(nextPageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await page.waitForTimeout(2000);

          loadMoreClicks++;
          console.log(`      ✓ Page chargée`);

        } catch (err) {
          console.error(`      ✗ Erreur chargement page: ${err.message}`);
          break;
        }
      }

      // Vérification finale
      if (products.length < MIN_NEW_PRODUCTS) {
        console.log(`\n   ⚠️ ATTENTION: Seulement ${products.length}/${MIN_NEW_PRODUCTS} nouveaux produits trouvés`);
        console.log(`   💡 Il faudrait peut-être élargir les filtres de prix ou essayer une autre catégorie\n`);
      }

      console.log(`\n   ✅ Catégorie terminée: ${products.length} nouveaux produits | ${skipped} skippés\n`);
    } catch (err) {
      console.error(`   ❌ Erreur catégorie: ${err.message}`);
    } finally {
      await page.close();
    }

    return products;
  }

  /**
   * Appliquer les filtres de prix sur FNAC Pro
   */
  async applyPriceFilters(page, maxPrice) {
    try {
      console.log(`   💶 Application des 2 filtres obligatoires...`);
      await page.waitForTimeout(5000); // Augmenté à 5 secondes

      // DEBUG: Voir tous les labels disponibles
      const allLabels = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('label')).map(l => l.innerText.trim());
      });
      console.log(`   🔍 DEBUG - Labels trouvés:`, allLabels.slice(0, 20)); // Afficher les 20 premiers

      // Trouver et cliquer les 2 filtres
      const filtersToApply = ['<10€', 'De 10 à 20€'];

      for (const filterText of filtersToApply) {
        const clicked = await page.evaluate((text) => {
          const labels = Array.from(document.querySelectorAll('label'));
          const label = labels.find(l => l.innerText.trim() === text);

          if (label) {
            // Cliquer directement sur le label (ça coche la checkbox associée)
            label.click();
            return true;
          }
          return false;
        }, filterText);

        if (clicked) {
          console.log(`      ✓ Filtre "${filterText}" cliqué`);
          await page.waitForTimeout(2000); // Attendre le rechargement
        } else {
          console.log(`      ⚠️ Filtre "${filterText}" non trouvé !`);
        }
      }

      // Vérifier que les filtres sont bien cochés
      const verified = await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));
        return checkboxes.length;
      });

      console.log(`   ✓ ${verified} filtres cochés au total`);

    } catch (err) {
      console.error(`   ⚠️ Erreur filtres: ${err.message}`);
    }
  }

  /**
   * Extraire détails produit depuis FNAC Pro
   */
  async getProductDetails(url) {
    const page = await this.puppeteerBrowser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000); // Attendre que la page charge

      const data = await page.evaluate(() => {
        // Nouveaux sélecteurs FNAC Pro
        const priceEl = document.querySelector('.f-faPriceBox__price.userPrice, .f-faPriceBox__price');
        const titleEl = document.querySelector('h1.f-productHeader__heading, h1');

        // EAN et Marque: chercher dans les propriétés produit
        let ean = null;
        let brand = null;
        const dtElements = document.querySelectorAll('dt.f-productProperties__term');
        for (const dt of dtElements) {
          const term = dt.innerText.trim();
          const dd = dt.nextElementSibling;

          if (term === 'EAN' && dd) {
            const text = dd.innerText.trim().replace(/\s/g, ''); // Enlever tous les espaces
            // Vérifier que c'est bien un EAN (13 chiffres)
            if (/^\d{13}$/.test(text)) {
              ean = text;
            }
          }

          if (term === 'Editeur' && dd) {
            brand = dd.innerText.trim();
          }
        }

        return {
          price: priceEl ? parseFloat(priceEl.innerText.replace(',', '.').replace(/[^0-9.]/g, '')) : null,
          ean: ean,
          brand: brand || 'Unknown',
          title: titleEl ? titleEl.innerText.trim() : null,
          url: window.location.href
        };
      });

      await page.close();

      console.log(`      📊 Extrait: prix=${data.price}, EAN=${data.ean ? 'OK' : 'MANQUANT'}`);

      if (!data.price || !data.ean) return null;
      return data;
    } catch (err) {
      console.error(`      ❌ getProductDetails error: ${err.message}`);
      await page.close();
      return null;
    }
  }

  /**
   * PHASE 2: Trouver ASIN sur Amazon via EAN
   */
  async findAsinOnAmazon(ean) {
    const page = await this.puppeteerBrowser.newPage();

    try {
      await page.goto(`https://www.amazon.fr/s?k=${ean}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      const asin = await page.evaluate(() => {
        const firstResult = document.querySelector('[data-asin]:not([data-asin=""])');
        return firstResult ? firstResult.getAttribute('data-asin') : null;
      });

      await page.close();
      return asin;
    } catch (err) {
      await page.close();
      return null;
    }
  }

  /**
   * PHASE 3: Vérifier restriction Seller Central
   */
  async checkSellerCentral(asin) {
    const scPage = await this.playwrightContext.newPage();

    try {
      const url = `https://sellercentral.amazon.fr/product-search/search?q=${asin}`;
      await scPage.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

      console.log(`   📍 URL: ${scPage.url()}`);

      // Attendre le dropdown
      await scPage.waitForTimeout(5000);

      // Trouver le dropdown dans le Shadow DOM
      const dropdownFound = await scPage.evaluate(async () => {
        const iframe = document.querySelector('iframe#sif-container');
        if (!iframe || !iframe.contentDocument) return false;

        const dropdown = iframe.contentDocument.querySelector('kat-dropdown');
        if (!dropdown || !dropdown.shadowRoot) return false;

        const trigger = dropdown.shadowRoot.querySelector('kat-button');
        if (trigger) trigger.click();

        await new Promise(r => setTimeout(r, 1000));

        const menu = dropdown.shadowRoot.querySelector('kat-menu');
        if (!menu || !menu.shadowRoot) return false;

        const options = Array.from(menu.shadowRoot.querySelectorAll('kat-menu-item'));
        const newOption = options.find(opt => opt.innerText.includes('Neuf'));

        if (newOption) {
          newOption.click();
          return true;
        }

        return false;
      });

      if (!dropdownFound) {
        console.log(`   ⚠️ Dropdown non trouvé`);
        await scPage.close();
        return null;
      }

      console.log(`   ✓ Option "Neuf" sélectionnée`);

      // Attendre le bouton "Vendre"
      await scPage.waitForTimeout(3000);

      // Cliquer sur le bouton
      const clicked = await scPage.evaluate(() => {
        const iframe = document.querySelector('iframe#sif-container');
        if (!iframe || !iframe.contentDocument) return false;

        const buttons = iframe.contentDocument.querySelectorAll('button, kat-button');
        for (const btn of buttons) {
          const text = btn.innerText || btn.textContent || '';
          if (text.includes('Vendre ce produit')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!clicked) {
        console.log(`   ⚠️ Bouton non trouvé`);
        await scPage.close();
        return null;
      }

      console.log(`   ✓ Bouton cliqué`);

      // Attendre nouvelle page
      await scPage.waitForTimeout(3000);

      const context = scPage.context();
      const allPages = context.pages();
      let currentPage = scPage;

      if (allPages.length > 1) {
        currentPage = allPages[allPages.length - 1];
        console.log(`   ✅ Nouvelle page détectée`);
      }

      // Extraire les infos
      await currentPage.waitForTimeout(5000);

      const restrictionData = await currentPage.evaluate((asinParam) => {
        const bodyText = document.body.innerText || '';

        // Non restreint
        if (bodyText.includes('Vous pouvez vendre ce produit')) {
          return {
            asin: asinParam,
            isRestricted: false,
            type: null,
            approvalText: null,
            units: 1
          };
        }

        // Restreint
        if (bodyText.includes('Demande d\'autorisation')) {
          // Extraire type et texte
          let type = 'BRAND';
          let approvalText = '';

          const categoryKeywords = ['Baby Products', 'Grocery', 'Health', 'Beauty', 'Pet Supplies', 'Toys'];
          for (const keyword of categoryKeywords) {
            if (bodyText.includes(keyword)) {
              type = 'CATEGORY';
              approvalText = keyword;
              break;
            }
          }

          if (type === 'BRAND') {
            const match = bodyText.match(/marque\s+([A-Za-z0-9\s-]+)/i);
            if (match) approvalText = match[1].trim();
          }

          return {
            asin: asinParam,
            isRestricted: true,
            type,
            approvalText,
            units: 1
          };
        }

        return null;
      }, asin);

      await currentPage.close();
      return restrictionData;
    } catch (err) {
      console.error(`   ❌ Erreur Seller Central: ${err.message}`);
      await scPage.close();
      return null;
    }
  }

  /**
   * Charger les EAN déjà en base (pour skip)
   */
  async loadExistingEANs() {
    const { data, error } = await supabase
      .from('products')
      .select('ean');

    if (error) {
      console.error(`   ⚠️ Erreur chargement EAN: ${error.message}`);
      return new Set();
    }

    return new Set(data.map(p => p.ean));
  }

  /**
   * Sauvegarder produit en DB
   */
  async saveProduct(productData) {
    const { data, error } = await supabase
      .from('products')
      .upsert({
        brand: productData.brand,
        title: productData.title,
        price: productData.price,
        ean: productData.ean,
        url: productData.url
      }, { onConflict: 'ean' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Sauvegarder restriction en DB
   */
  async saveRestriction(restrictionData) {
    const { data, error } = await supabase
      .from('restrictions')
      .upsert({
        asin: restrictionData.asin,
        is_restricted: restrictionData.isRestricted,
        units_required: restrictionData.units,
        approval_text: restrictionData.approvalText,
        type: restrictionData.type,
        checked_at: new Date().toISOString()
      }, { onConflict: 'asin' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async saveOpportunity(productData, restrictionData) {
    try {
      // Récupérer product_id via EAN
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, price, title, brand')
        .eq('ean', productData.ean)
        .single();

      if (productError) throw productError;

      console.log(`         🔗 Linking: product_id=${product.id} (${product.brand} - ${product.title?.substring(0, 30)}...)`);

      // Récupérer restriction_id via ASIN
      const { data: restriction, error: restrictionError } = await supabase
        .from('restrictions')
        .select('id')
        .eq('asin', restrictionData.asin)
        .single();

      if (restrictionError) throw restrictionError;

      // Calculer score et coûts (prix FNAC = TTC)
      const TVA = 0.20;
      const units = restrictionData.units || 1;
      const costTTC = product.price * units; // Prix FNAC déjà en TTC
      const costHT = costTTC / (1 + TVA);
      const bonus = restrictionData.type === 'CATEGORY' ? 1.5 : 1.0;
      const score = (bonus / costTTC) * 100; // Score sur 100

      // Créer l'opportunity
      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          scan_id: this.currentScanId,
          product_id: product.id,
          restriction_id: restriction.id,
          cost_ht: costHT,
          cost_ttc: costTTC,
          score: score
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`   ⚠️ Erreur saveOpportunity: ${err.message}`);
      return null;
    }
  }
}

module.exports = new ScraperHybridV2();
