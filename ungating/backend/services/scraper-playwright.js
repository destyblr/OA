const { chromium } = require('playwright');
const categoryMapping = require('../config/fnac-categories');
const supabase = require('../config/supabase');

/**
 * SCRAPER V3 - Migration vers Playwright pour meilleur support iframes/Shadow DOM
 */
class ScraperV3 {
  constructor() {
    this.browser = null;
    this.context = null;
    this.fnacPage = null; // Page FNAC principale (reste ouverte)
  }

  async init() {
    if (!this.browser) {
      // Utiliser launchPersistentContext pour charger le profil Chrome avec session
      this.context = await chromium.launchPersistentContext(
        'C:\\Users\\desty\\AppData\\Local\\puppeteer-oa',
        {
          headless: false,
          channel: 'chrome', // Utiliser Google Chrome au lieu de Chromium
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--lang=fr-FR',
            '--accept-lang=fr-FR,fr'
          ],
          locale: 'fr-FR',
          timezoneId: 'Europe/Paris',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
      );

      // Avec launchPersistentContext, pas de browser object
      this.browser = this.context;
      this.fnacPage = await this.context.newPage();
    }
  }

  async close() {
    if (this.context) {
      await this.context.close();
      this.browser = null;
      this.context = null;
      this.fnacPage = null;
    }
  }

  /**
   * Détecter CAPTCHA et attendre résolution manuelle
   */
  async waitForCaptchaSolution() {
    let hasCaptcha = false;

    try {
      hasCaptcha = await this.fnacPage.evaluate(() => {
        const bodyText = document.body.innerText;
        return bodyText.includes('We want to make sure') ||
               bodyText.includes('Slide right to secure') ||
               bodyText.includes('not a robot');
      });
    } catch (err) {
      return;
    }

    if (hasCaptcha) {
      console.log('\n   🤖 CAPTCHA DÉTECTÉ!');
      console.log('   ⏸️  RÉSOUS LE CAPTCHA MANUELLEMENT dans la fenêtre Chrome');
      console.log('   ⏳ Attente max 3 minutes...\n');

      const maxWaitTime = 180000; // 3 minutes
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        await this.fnacPage.waitForTimeout(2000);

        try {
          const solved = await this.fnacPage.evaluate(() => {
            return document.querySelectorAll('a.Article-title').length > 0;
          });

          if (solved) {
            console.log('   ✅ CAPTCHA résolu! Continuation du scan...\n');
            return;
          }
        } catch (err) {
          try {
            await this.fnacPage.waitForSelector('a.Article-title', { timeout: 1000 });
            console.log('   ✅ CAPTCHA résolu! Continuation du scan...\n');
            return;
          } catch (e) {
            // Pas encore résolu
          }
        }
      }

      throw new Error('CAPTCHA non résolu après 3 minutes');
    }
  }

  /**
   * Workflow principal: FNAC → Seller Central produit par produit
   */
  async runScan(scanId, maxPrice, categories, progressCallback = () => {}) {
    await this.init();

    let totalProcessed = 0;
    const MAX_PRODUCTS = 60;

    for (const catId of categories) {
      const catConfig = categoryMapping[catId];
      if (!catConfig) {
        console.warn(`⚠️ Catégorie inconnue: ${catId}`);
        continue;
      }

      console.log(`\n📦 Scraping catégorie: ${catConfig.label}`);

      // Naviguer vers FNAC Pro avec filtres
      await this.navigateToFnacWithFilters(catConfig, maxPrice);

      let productsOnPage = 0;
      let loadMoreClicks = 0;
      const MAX_LOAD_MORE = 2; // 20 → 40 → 60

      while (totalProcessed < MAX_PRODUCTS && loadMoreClicks <= MAX_LOAD_MORE) {
        // Extraire les liens produits visibles
        const productLinks = await this.fnacPage.evaluate(() => {
          return Array.from(document.querySelectorAll('a.Article-title')).map(a => ({
            title: a.innerText.trim(),
            url: a.href
          }));
        });

        console.log(`   📋 ${productLinks.length} produits visibles sur la page`);

        // Traiter chaque produit un par un
        for (let i = productsOnPage; i < productLinks.length && totalProcessed < MAX_PRODUCTS; i++) {
          const product = productLinks[i];
          totalProcessed++;
          productsOnPage++;

          console.log(`\n   [${totalProcessed}/60] ${product.title.substring(0, 50)}...`);

          try {
            // ÉTAPE 1: Récupérer prix + EAN depuis page produit
            const productData = await this.getProductDetails(product.url);

            if (!productData) {
              console.log(`      ✗ Données manquantes (prix ou EAN)`);
              continue;
            }

            // ÉTAPE 2: Sauvegarder produit en DB
            const savedProduct = await this.saveProduct(productData);
            console.log(`      ✓ Produit sauvegardé en DB (ID: ${savedProduct.id})`);

            // ÉTAPE 3: Check Seller Central (pour récupérer ASIN)
            const restriction = await this.checkSellerCentral(productData.ean);

            if (!restriction) {
              console.log(`      ⚠️ ASIN non trouvé, skip sauvegarde restriction`);
            } else {
              // ÉTAPE 4: Vérifier si ASIN déjà checké
              const existingRestriction = await this.getExistingRestriction(restriction.asin);

              if (existingRestriction) {
                console.log(`      ↻ ASIN ${restriction.asin} déjà checké, skip sauvegarde`);
              } else {
                // ÉTAPE 5: Sauvegarder restriction en DB (même si non restreint)
                await this.saveRestriction(restriction);

                if (restriction.isRestricted) {
                  console.log(`      ✓ Restriction: ${restriction.type} - ${restriction.units} unités (ASIN: ${restriction.asin})`);
                } else {
                  console.log(`      ✓ Pas de restriction (ASIN: ${restriction.asin})`);
                }
              }
            }

            progressCallback({
              productsProcessed: totalProcessed,
              maxProducts: MAX_PRODUCTS,
              currentProduct: product.title
            });

          } catch (err) {
            console.error(`      ❌ Erreur: ${err.message}`);
          }

          // Retour à la page FNAC
          try {
            if (!this.fnacPage.isClosed()) {
              await this.fnacPage.bringToFront();
              await this.fnacPage.waitForTimeout(1000);
              await this.fnacPage.waitForTimeout(2000);
            }
          } catch (err) {
            console.error(`      ⚠️ Impossible de revenir à la page FNAC: ${err.message}`);
            this.fnacPage = await this.context.newPage();
            break;
          }
        }

        // Cliquer "Voir plus d'articles" si besoin
        if (totalProcessed < MAX_PRODUCTS && loadMoreClicks < MAX_LOAD_MORE) {
          const hasMoreButton = await this.fnacPage.evaluate(() => {
            const button = Array.from(document.querySelectorAll('button, a')).find(
              el => el.innerText.includes("Voir plus d'articles")
            );
            if (button) {
              button.click();
              return true;
            }
            return false;
          });

          if (hasMoreButton) {
            loadMoreClicks++;
            console.log(`\n   📄 Chargement de plus d'articles (${loadMoreClicks}/2)...`);
            await this.fnacPage.waitForTimeout(3000);
            productsOnPage = 0;
          } else {
            console.log(`\n   ⚠️ Pas de bouton "Voir plus d'articles"`);
            break;
          }
        } else {
          break;
        }
      }
    }

    console.log(`\n✅ Scan terminé: ${totalProcessed} produits traités`);
    return totalProcessed;
  }

  /**
   * Naviguer vers FNAC Pro avec filtres appliqués
   */
  async navigateToFnacWithFilters(catConfig, maxPrice) {
    let url;
    if (catConfig.type === 'search') {
      url = `https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=${encodeURIComponent(catConfig.keyword)}&sft=1`;
    } else {
      url = catConfig.url;
    }

    console.log(`   🔗 Navigation: ${url}`);
    await this.fnacPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.fnacPage.waitForTimeout(5000);

    await this.waitForCaptchaSolution();

    await this.fnacPage.waitForSelector('a.Article-title', { timeout: 15000 }).catch(() => {
      console.log('   ⚠️ Sélecteur a.Article-title non trouvé');
    });

    await this.fnacPage.waitForTimeout(2000);

    // Accepter cookies
    const cookiesAccepted = await this.fnacPage.evaluate(() => {
      const acceptButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.innerText.includes('Accepter') || btn.innerText.includes('Accept')
      );
      if (acceptButton) {
        acceptButton.click();
        return true;
      }
      return false;
    });

    if (cookiesAccepted) {
      console.log(`   🍪 Cookies acceptés`);
      await this.fnacPage.waitForTimeout(2000);
    }

    const productsBeforeFilter = await this.fnacPage.evaluate(() => {
      return document.querySelectorAll('a.Article-title').length;
    });
    console.log(`   📋 ${productsBeforeFilter} produits avant filtres`);

    if (productsBeforeFilter === 0) {
      console.log(`   ⚠️ Aucun produit trouvé, skip filtres`);
      return;
    }

    // Appliquer filtres prix
    console.log(`   💶 Application filtres ≤${maxPrice}€...`);
    const filtersToClick = [];

    if (maxPrice >= 10) {
      filtersToClick.push('<10€', 'De 10 à 20€');
    } else {
      filtersToClick.push('<10€');
    }

    for (const filterText of filtersToClick) {
      const clicked = await this.fnacPage.evaluate((text) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find(l => l.innerText.trim() === text);
        if (label) {
          const checkbox = label.querySelector('input[type="checkbox"]');
          if (checkbox && !checkbox.checked) {
            checkbox.click();
            return true;
          }
        }
        return false;
      }, filterText);

      if (clicked) {
        console.log(`      ✓ Filtre "${filterText}" cliqué`);
        await this.fnacPage.waitForTimeout(2000);
      }
    }

    console.log(`   ✓ Filtres appliqués`);
    await this.fnacPage.waitForTimeout(3000);

    const productsAfterFilter = await this.fnacPage.evaluate(() => {
      return document.querySelectorAll('a.Article-title').length;
    });
    console.log(`   📋 ${productsAfterFilter} produits visibles sur la page`);
  }

  /**
   * Récupérer prix + EAN depuis page produit
   */
  async getProductDetails(productUrl) {
    let productPage = null;

    try {
      productPage = await this.context.newPage();
      await productPage.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await productPage.waitForTimeout(2000);

      const data = await productPage.evaluate(() => {
        // Prix
        const priceElement = document.querySelector('.ProductSummary-price');
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

        // Marque
        const brandElement = document.querySelector('.ProductInfo-brand');
        const brand = brandElement?.innerText.trim();

        // Titre
        const title = document.querySelector('.ProductSummary-title')?.innerText.trim();

        return { price, ean, brand, title, url: window.location.href };
      });

      if (!data.price || !data.ean) {
        return null;
      }

      return data;
    } catch (err) {
      throw err;
    } finally {
      if (productPage && !productPage.isClosed()) {
        await productPage.close();
      }
    }
  }

  /**
   * Check Seller Central avec EAN - VERSION PLAYWRIGHT AVEC MEILLEUR SUPPORT IFRAMES
   */
  async checkSellerCentral(ean) {
    let scPage = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      scPage = await this.context.newPage();

      const url = `https://sellercentral.amazon.fr/product-search/keywords/search?q=${ean}`;
      await scPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      await scPage.waitForTimeout(10000);

      // Vérifier login
      let isLoggedIn = false;
      const maxAttempts = 60;
      let attempts = 0;

      while (!isLoggedIn && attempts < maxAttempts) {
        const needsLogin = await scPage.evaluate(() => {
          return document.body.innerText.includes('Se connecter') ||
                 document.URL.includes('/ap/signin') ||
                 document.body.innerText.includes('Sign in');
        });

        if (needsLogin) {
          if (attempts === 0) {
            console.log(`      🔐 CONNECTE-TOI À SELLER CENTRAL dans la fenêtre Chrome!`);
            console.log(`      ⏳ J'attends max 5 minutes...`);
          }
          await scPage.waitForTimeout(5000);
          attempts++;
        } else {
          isLoggedIn = true;
          console.log(`      ✅ Connecté à Seller Central!`);
        }
      }

      if (!isLoggedIn) {
        throw new Error('Connexion Seller Central timeout après 5 minutes');
      }

      // Extraire ASIN
      const asin = await scPage.evaluate(() => {
        const urlMatch = window.location.href.match(/\/([A-Z0-9]{10})/);
        if (urlMatch) return urlMatch[1];

        const bodyText = document.body.innerText;
        const asinMatch = bodyText.match(/ASIN[:\s]*([A-Z0-9]{10})/i);
        if (asinMatch) return asinMatch[1];

        return null;
      });

      if (!asin) {
        console.log(`      ⚠️ ASIN non trouvé pour EAN ${ean}`);
        return null;
      }

      console.log(`      🔍 Vérification restriction pour ASIN ${asin}...`);

      // PLAYWRIGHT: Meilleure détection des iframes avec locator
      // Essayer TOUTES les méthodes Playwright pour trouver le dropdown
      let targetFrame = null;
      let selectFound = false;

      console.log(`      📊 Recherche du dropdown avec Playwright...`);

      // Méthode 1: Chercher dans tous les frames()
      const frames = scPage.frames();
      console.log(`      📊 ${frames.length} frames trouvés`);

      for (const frame of frames) {
        try {
          // Attendre le select avec timeout court
          await frame.waitForSelector('select', { timeout: 5000 });

          // Vérifier si c'est le bon select
          const isCorrect = await frame.evaluate(() => {
            const select = document.querySelector('select');
            if (!select) return false;
            const hasNewOption = Array.from(select.options).some(opt =>
              opt.text.includes('New') || opt.text.includes('Neuf') || opt.text.includes('new')
            );
            return hasNewOption;
          });

          if (isCorrect) {
            targetFrame = frame;
            selectFound = true;
            console.log(`      ✓ Dropdown trouvé dans frame !`);
            break;
          }
        } catch (err) {
          // Ce frame n'a pas le select
        }
      }

      // Méthode 2 (si échec): Utiliser frameLocator() pour chercher dans les nested iframes
      if (!selectFound) {
        console.log(`      📊 Tentative avec frameLocator pour nested iframes...`);
        try {
          // Chercher tous les iframes de la page
          const iframes = await scPage.locator('iframe').all();
          console.log(`      📊 ${iframes.length} iframes via locator`);

          for (let i = 0; i < iframes.length; i++) {
            try {
              const frameLocator = scPage.frameLocator(`iframe >> nth=${i}`);
              const selectLocator = frameLocator.locator('select');

              // Vérifier si visible
              await selectLocator.waitFor({ state: 'visible', timeout: 2000 });

              const hasNewOption = await selectLocator.evaluate((select) => {
                return Array.from(select.options).some(opt =>
                  opt.text.includes('New') || opt.text.includes('Neuf')
                );
              });

              if (hasNewOption) {
                console.log(`      ✓ Dropdown trouvé via frameLocator !`);
                // Utiliser directement le locator pour les actions
                await selectLocator.selectOption({ label: /Neuf|New/i });
                console.log(`      ✓ État "Neuf" sélectionné`);

                await scPage.waitForTimeout(2000);

                // Cliquer sur le bouton "Vendre"
                const sellButton = frameLocator.locator('button', { hasText: /Vendre ce produit|Sell this product/i });
                await sellButton.click();
                console.log(`      ✓ Bouton "Vendre ce produit" cliqué`);

                selectFound = true;
                break;
              }
            } catch (err) {
              // Ce iframe n'a pas le select ou erreur
            }
          }
        } catch (err) {
          console.log(`      ⚠️ Erreur frameLocator: ${err.message}`);
        }
      }

      if (!selectFound) {
        console.log(`      ⚠️ Dropdown non trouvé avec Playwright`);
        return null;
      }

      // Si on a utilisé targetFrame (méthode 1), faire les actions
      if (targetFrame && !selectFound) {
        // Sélectionner "Neuf"
        const stateSelected = await targetFrame.evaluate(() => {
          const select = document.querySelector('select');
          if (select) {
            const newOption = Array.from(select.options).find(opt =>
              opt.text.includes('New') || opt.text.includes('Neuf')
            );
            if (newOption) {
              select.value = newOption.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        });

        console.log(`      ${stateSelected ? '✓' : '⚠️'} État "Neuf" ${stateSelected ? 'sélectionné' : 'non trouvé'}`);

        await scPage.waitForTimeout(2000);

        // Cliquer "Vendre ce produit"
        const sellClicked = await targetFrame.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const sellButton = buttons.find(btn =>
            btn.innerText.includes('Sell this product') ||
            btn.innerText.includes('Vendre ce produit') ||
            btn.innerText.includes('Demande de vente')
          );
          if (sellButton) {
            sellButton.click();
            return true;
          }
          return false;
        });

        if (!sellClicked) {
          console.log(`      ⚠️ Bouton "Vendre ce produit" non trouvé`);
          return null;
        }

        console.log(`      ✓ Bouton "Vendre ce produit" cliqué`);
      }

      // Attendre navigation
      try {
        await scPage.waitForLoadState('networkidle', { timeout: 15000 });
      } catch (err) {
        await scPage.waitForTimeout(3000);
      }

      const currentUrl = scPage.url();

      // Vérifier si restreint
      if (currentUrl.includes('/interactive/listing/workflow/offer')) {
        return {
          isRestricted: false,
          type: null,
          approvalText: null,
          units: null,
          asin
        };
      }

      if (!currentUrl.includes('/hz/approvalrequest/restrictions/approve')) {
        console.log(`      ⚠️ URL inattendue: ${currentUrl}`);
        return null;
      }

      // Extraire infos restriction
      const restrictionInfo = await scPage.evaluate(() => {
        const bodyText = document.body.innerText;
        let type = null;
        let approvalText = '';

        const brandMatch = bodyText.match(/Marque\s+([^\s][^en]+?)\s+en\s+état/i);
        if (brandMatch) {
          type = 'BRAND';
          approvalText = brandMatch[1].trim();
        } else {
          const categoryMatch = bodyText.match(/Catégorie\s+([^\s][^en]+?)\s+en\s+état/i);
          if (categoryMatch) {
            type = 'CATEGORY';
            approvalText = categoryMatch[1].trim();
          }
        }

        return { type, approvalText };
      });

      if (!restrictionInfo.type) {
        console.log(`      ⚠️ Type de restriction non détecté`);
        return null;
      }

      // Cliquer "Demande d'autorisation"
      const approvalClicked = await scPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const approvalButton = buttons.find(btn => btn.innerText.includes("Demande d'autorisation"));
        if (approvalButton) {
          approvalButton.click();
          return true;
        }
        return false;
      });

      if (!approvalClicked) {
        console.log(`      ⚠️ Bouton "Demande d'autorisation" non trouvé`);
        return {
          isRestricted: true,
          type: restrictionInfo.type,
          approvalText: restrictionInfo.approvalText,
          units: 1,
          asin
        };
      }

      try {
        await scPage.waitForLoadState('networkidle', { timeout: 15000 });
      } catch (err) {
        await scPage.waitForTimeout(3000);
      }

      const units = await scPage.evaluate(() => {
        const bodyText = document.body.innerText;
        const unitsMatch = bodyText.match(/au\s+moins\s+(\d+)\s+unités/i);
        return unitsMatch ? parseInt(unitsMatch[1]) : 1;
      });

      return {
        isRestricted: true,
        type: restrictionInfo.type,
        approvalText: restrictionInfo.approvalText,
        units,
        asin
      };

    } catch (err) {
      throw err;
    } finally {
      if (scPage && !scPage.isClosed()) {
        await scPage.close();
      }
    }
  }

  /**
   * Sauvegarder produit en DB
   */
  async saveProduct(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        title: productData.title,
        brand: productData.brand,
        price: productData.price,
        ean: productData.ean,
        url: productData.url,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Sauvegarder restriction en DB
   */
  async saveRestriction(restriction) {
    const { error } = await supabase
      .from('restrictions')
      .insert({
        asin: restriction.asin,
        is_restricted: restriction.isRestricted,
        units_required: restriction.units,
        approval_text: restriction.approvalText,
        type: restriction.type,
      });

    if (error) throw error;
  }

  /**
   * Vérifier si ASIN déjà en DB
   */
  async getExistingRestriction(asin) {
    const { data } = await supabase
      .from('restrictions')
      .select('*')
      .eq('asin', asin)
      .single();

    return data;
  }
}

module.exports = new ScraperV3();
