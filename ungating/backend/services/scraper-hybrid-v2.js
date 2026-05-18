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

    // ============================================
    // PHASE 2: TROUVER ASIN SUR AMAZON
    // ============================================
    console.log('\n🔍 PHASE 2: RECHERCHE ASIN SUR AMAZON\n');

    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      console.log(`[${i+1}/${allProducts.length}] ${product.brand} - ${product.title.substring(0, 40)}...`);

      try {
        const asin = await this.findAsinOnAmazon(product.ean);

        if (asin) {
          product.asin = asin;
          // Mettre à jour en DB
          await supabase
            .from('products')
            .update({ asin })
            .eq('id', product.id);
          console.log(`   ✓ ASIN trouvé: ${asin}`);
        } else {
          console.log(`   ⚠️ ASIN non trouvé`);
        }
      } catch (err) {
        console.error(`   ❌ Erreur: ${err.message}`);
      }

      progressCallback({
        phase: 'amazon',
        current: i + 1,
        total: allProducts.length
      });
    }

    console.log(`\n✅ PHASE 2 TERMINÉE\n`);

    // Fermer Puppeteer avant Playwright
    await this.puppeteerBrowser.close();
    this.puppeteerBrowser = null;

    // ============================================
    // PHASE 3: VÉRIFIER SELLER CENTRAL
    // ============================================
    console.log('\n🎯 PHASE 3: VÉRIFICATION SELLER CENTRAL\n');
    await this.initPlaywright();

    const productsWithAsin = allProducts.filter(p => p.asin);
    console.log(`${productsWithAsin.length} produits avec ASIN à vérifier\n`);

    for (let i = 0; i < productsWithAsin.length; i++) {
      const product = productsWithAsin[i];
      console.log(`[${i+1}/${productsWithAsin.length}] ASIN ${product.asin}`);

      try {
        const restriction = await this.checkSellerCentral(product.asin);

        if (restriction) {
          await this.saveRestriction(restriction);

          if (restriction.isRestricted) {
            console.log(`   ✓ RESTREINT: ${restriction.type} - ${restriction.approvalText}`);
            console.log(`   📦 ${restriction.units} unités requises`);
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
        total: productsWithAsin.length
      });
    }

    console.log(`\n✅ PHASE 3 TERMINÉE\n`);

    await this.close();
    return allProducts.length;
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

      // Extraire tous les produits
      const MAX_PRODUCTS = 60;
      let loadMoreClicks = 0;
      const MAX_LOAD_MORE = 2;

      while (products.length < MAX_PRODUCTS && loadMoreClicks <= MAX_LOAD_MORE) {
        const productLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a.Article-title')).map(a => ({
            title: a.innerText.trim(),
            url: a.href
          }));
        });

        console.log(`   📋 ${productLinks.length} produits sur la page`);

        // Extraire détails de chaque produit
        for (const link of productLinks) {
          if (products.length >= MAX_PRODUCTS) break;

          console.log(`   → ${link.title.substring(0, 50)}...`);

          try {
            const productData = await this.getProductDetails(link.url);

            if (productData) {
              // Sauvegarder en DB
              const saved = await this.saveProduct(productData);
              products.push({ ...productData, id: saved.id });
              console.log(`      ✓ ${productData.brand} - ${productData.price}€`);
            } else {
              console.log(`      ✗ Données manquantes`);
            }
          } catch (err) {
            console.error(`      ✗ Erreur: ${err.message}`);
          }
        }

        // Cliquer "Voir plus"
        if (products.length < MAX_PRODUCTS && loadMoreClicks < MAX_LOAD_MORE) {
          try {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1000);

            const loadMoreBtn = await page.$('button.Article-itemListShowMore, a.Article-itemListShowMore');
            if (loadMoreBtn) {
              await loadMoreBtn.click();
              await page.waitForTimeout(2000);
              loadMoreClicks++;
            } else {
              break;
            }
          } catch {
            break;
          }
        } else {
          break;
        }
      }
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

        // EAN: chercher dans les propriétés produit
        let ean = null;
        const dtElements = document.querySelectorAll('dt.f-productProperties__term');
        for (const dt of dtElements) {
          if (dt.innerText.trim() === 'EAN') {
            const dd = dt.nextElementSibling;
            if (dd) {
              const text = dd.innerText.trim().replace(/\s/g, ''); // Enlever tous les espaces
              // Vérifier que c'est bien un EAN (13 chiffres)
              if (/^\d{13}$/.test(text)) {
                ean = text;
                break;
              }
            }
          }
        }

        // Marque: chercher "Editeur" dans les caractéristiques
        let brand = null;
        const dtElements = document.querySelectorAll('dt.f-productProperties__term');
        for (const dt of dtElements) {
          if (dt.innerText.trim() === 'Editeur') {
            const dd = dt.nextElementSibling;
            if (dd) brand = dd.innerText.trim();
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
}

module.exports = new ScraperHybridV2();
