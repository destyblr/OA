const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const categoryMapping = require('../config/fnac-categories');
const supabase = require('../config/supabase');

/**
 * SCRAPER V2 - Produit par produit avec sauvegarde DB incrémentale
 */
class ScraperV2 {
  constructor() {
    this.browser = null;
    this.fnacPage = null; // Page FNAC principale (reste ouverte)
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
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

      this.fnacPage = await this.browser.newPage();
      await this.fnacPage.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      );
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
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
      // Si erreur (contexte détruit), pas de CAPTCHA détectable
      return;
    }

    if (hasCaptcha) {
      console.log('\n   🤖 CAPTCHA DÉTECTÉ!');
      console.log('   ⏸️  RÉSOUS LE CAPTCHA MANUELLEMENT dans la fenêtre Chrome');
      console.log('   ⏳ Attente max 3 minutes...\n');

      // Attendre que le CAPTCHA disparaisse (produits apparaissent)
      const maxWaitTime = 180000; // 3 minutes
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        await this.fnacPage.waitForTimeout(2000);

        try {
          const solved = await this.fnacPage.evaluate(() => {
            // CAPTCHA résolu = produits visibles
            return document.querySelectorAll('a.Article-title').length > 0;
          });

          if (solved) {
            console.log('   ✅ CAPTCHA résolu! Continuation du scan...\n');
            return;
          }
        } catch (err) {
          // Si erreur, la page a peut-être navigué après résolution CAPTCHA
          // Vérifier si produits visibles via waitForSelector
          try {
            await this.fnacPage.waitForSelector('a.Article-title', { timeout: 1000 });
            console.log('   ✅ CAPTCHA résolu! Continuation du scan...\n');
            return;
          } catch (e) {
            // Pas encore résolu, continuer la boucle
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
              // Délai supplémentaire entre produits pour éviter timeouts
              await this.fnacPage.waitForTimeout(2000);
            }
          } catch (err) {
            console.error(`      ⚠️ Impossible de revenir à la page FNAC: ${err.message}`);
            // Recréer la page si elle a crash
            this.fnacPage = await this.browser.newPage();
            break; // Sortir de la boucle, catégorie suivante
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
            productsOnPage = 0; // Reset pour la nouvelle page
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
    await this.fnacPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Attendre que la page soit vraiment stable
    await this.fnacPage.waitForTimeout(3000);

    // Détecter et attendre résolution CAPTCHA
    await this.waitForCaptchaSolution();

    // Attendre que les produits soient visibles
    await this.fnacPage.waitForSelector('a.Article-title', { timeout: 15000 }).catch(() => {
      console.log('   ⚠️ Sélecteur a.Article-title non trouvé');
    });

    await this.fnacPage.waitForTimeout(2000);

    // Accepter cookies si bannière présente
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

    // Vérifier que des produits sont visibles AVANT filtres
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
    // Cliquer seulement les ranges qui sont COMPLÈTEMENT sous maxPrice
    if (maxPrice >= 10) filtersToClick.push('<10€');
    // Pour maxPrice=12€, on clique quand même "De 10 à 20€" car on filtre ensuite dans le code
    if (maxPrice > 10) filtersToClick.push('De 10 à 20€');

    for (const filterText of filtersToClick) {
      const clicked = await this.fnacPage.evaluate((text) => {
        // Chercher le label avec le texte exact
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find(l => l.innerText.trim() === text);

        if (label) {
          // Cliquer directement sur le label (pas de checkbox)
          label.click();
          return true;
        }
        return false;
      }, filterText);

      if (clicked) {
        console.log(`      ✓ Filtre "${filterText}" cliqué`);
        // Attendre que la page se recharge (AJAX)
        await this.fnacPage.waitForTimeout(4000);
      } else {
        console.log(`      ⚠️ Filtre "${filterText}" non trouvé`);
      }
    }

    await this.fnacPage.waitForTimeout(2000);
    console.log(`   ✓ Filtres appliqués`);
  }

  /**
   * Récupérer détails produit (prix + EAN + brand)
   */
  async getProductDetails(productUrl) {
    let productPage = null;

    try {
      // Petit délai avant de créer un nouvel onglet
      await new Promise(resolve => setTimeout(resolve, 500));

      // Ouvrir dans un nouvel onglet
      productPage = await this.browser.newPage();

      try {
        await productPage.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      } catch (err) {
        // Réessayer avec domcontentloaded si networkidle2 timeout
        await productPage.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      }

      await productPage.waitForTimeout(1000);

      const data = await productPage.evaluate(() => {
        // Titre
        const title = document.querySelector('h1, .ProductSummary-title')?.innerText.trim();

        // Brand / Marque
        let brand = 'Unknown';
        const brandEl = document.querySelector('[itemprop="brand"], .brand, .Brand');
        if (brandEl) {
          brand = brandEl.innerText.trim();
        } else {
          // Chercher dans le texte
          const bodyText = document.body.innerText;
          const brandMatch = bodyText.match(/Marque[:\s]*([^\n]+)/i);
          if (brandMatch) brand = brandMatch[1].trim();
        }

        // Prix HT
        let price = null;
        const priceEl = document.querySelector('.userPrice, [class*="price"]');
        if (priceEl) {
          const priceText = priceEl.innerText.replace(/[^\d,\.]/g, '').replace(',', '.');
          price = parseFloat(priceText);
        }

        // EAN
        let ean = null;
        const bodyText = document.body.innerText;
        const eanMatch = bodyText.match(/EAN[:\s]*(\d{13})/i);
        if (eanMatch) ean = eanMatch[1];

        // Référence (alternative à EAN)
        const refMatch = bodyText.match(/R[ée]f[ée]rence[:\s]*(\d{13})/i);
        if (!ean && refMatch) ean = refMatch[1];

        return { title, brand, price, ean, url: window.location.href };
      });

      // Vérifier que prix et EAN existent (pas de filtre sur le montant)
      if (!data.price || !data.ean) {
        return null;
      }

      return data;

    } catch (err) {
      throw err;
    } finally {
      // Toujours fermer la page, même en cas d'erreur
      if (productPage && !productPage.isClosed()) {
        await productPage.close();
      }
    }
  }

  /**
   * Check Seller Central avec EAN
   */
  async checkSellerCentral(ean) {
    let scPage = null;

    try {
      // Petit délai avant de créer un nouvel onglet
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Ouvrir Seller Central dans un nouvel onglet
      scPage = await this.browser.newPage();

      // FORCER LA LANGUE À FRANÇAIS
      await scPage.setExtraHTTPHeaders({
        'Accept-Language': 'fr-FR,fr;q=0.9'
      });

      const url = `https://sellercentral.amazon.fr/product-search/keywords/search?q=${ean}`;
      await scPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Attendre LONGTEMPS que la popup se charge complètement (elle met du temps !)
      await scPage.waitForTimeout(10000);

      // Vérifier si login requis et attendre VRAIMENT
      let isLoggedIn = false;
      const maxAttempts = 60; // 60 x 5s = 5 minutes max
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

          await scPage.waitForTimeout(5000); // Attendre 5s avant de re-vérifier
          attempts++;
        } else {
          isLoggedIn = true;
          console.log(`      ✅ Connecté à Seller Central!`);
        }
      }

      if (!isLoggedIn) {
        throw new Error('Connexion Seller Central timeout après 5 minutes');
      }

      // Extraire ASIN depuis l'URL ou la page
      const asin = await scPage.evaluate(() => {
        // Chercher ASIN dans l'URL (ex: /dp/B0ABC123)
        const urlMatch = window.location.href.match(/\/([A-Z0-9]{10})/);
        if (urlMatch) return urlMatch[1];

        // Chercher ASIN dans le texte de la page
        const bodyText = document.body.innerText;
        const asinMatch = bodyText.match(/ASIN[:\s]*([A-Z0-9]{10})/i);
        if (asinMatch) return asinMatch[1];

        return null;
      });

      if (!asin) {
        console.log(`      ⚠️ ASIN non trouvé pour EAN ${ean}`);
        return null;
      }

      // ÉTAPE 1: Attendre que le dropdown APPARAISSE (dans n'importe quel contexte)
      console.log(`      🔍 Vérification restriction pour ASIN ${asin}...`);
      console.log(`      ⏳ Attente dropdown (max 30s)...`);

      // Essayer de trouver le select dans TOUS les contextes possibles
      let targetFrame = null;

      try {
        // D'abord essayer dans chaque frame avec waitForSelector
        const frames = scPage.frames();
        console.log(`      📊 ${frames.length} frames, recherche du select...`);

        for (const frame of frames) {
          try {
            await frame.waitForSelector('select', { timeout: 5000 });
            // Vérifier si c'est le bon select (avec option Neuf/New)
            const isCorrect = await frame.evaluate(() => {
              const select = document.querySelector('select');
              if (!select) return false;
              return Array.from(select.options).some(opt =>
                opt.text.includes('New') || opt.text.includes('Neuf') || opt.text.includes('new')
              );
            });
            if (isCorrect) {
              targetFrame = frame;
              console.log(`      ✓ Dropdown trouvé dans frame ${frames.indexOf(frame)} !`);
              break;
            }
          } catch (err) {
            // Ce frame n'a pas de select, continuer
          }
        }
      } catch (err) {
        console.log(`      ⚠️ Erreur recherche: ${err.message}`);
      }

      if (!targetFrame) {
        console.log(`      ⚠️ Dropdown non trouvé dans aucun frame`);
        return null;
      }

      // ÉTAPE 2: Sélectionner "Neuf" dans le dropdown (DANS LE FRAME)
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

      // ÉTAPE 3: Cliquer "Vendre ce produit" (DANS LE FRAME)
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

      // ÉTAPE 3: Attendre navigation avec timeout plus long
      try {
        await Promise.race([
          scPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
          scPage.waitForTimeout(15000)
        ]);
      } catch (err) {
        // Continuer même si timeout
      }

      await scPage.waitForTimeout(2000);
      const currentUrl = scPage.url();

      // ÉTAPE 4: Vérifier si restreint ou libre
      if (currentUrl.includes('/interactive/listing/workflow/offer')) {
        // Produit LIBRE (pas restreint)
        return {
          isRestricted: false,
          type: null,
          approvalText: null,
          units: null
        };
      }

      if (!currentUrl.includes('/hz/approvalrequest/restrictions/approve')) {
        // Page inattendue
        console.log(`      ⚠️ URL inattendue: ${currentUrl}`);
        return null;
      }

      // ÉTAPE 5: Produit RESTREINT - Extraire type et nom
      const restrictionInfo = await scPage.evaluate(() => {
        const bodyText = document.body.innerText;

        let type = null;
        let approvalText = '';

        // Chercher "Marque [Name]"
        const brandMatch = bodyText.match(/Marque\s+([^\s][^en]+?)\s+en\s+état/i);
        if (brandMatch) {
          type = 'BRAND';
          approvalText = brandMatch[1].trim();
        } else {
          // Chercher "Catégorie [Name]"
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

      // ÉTAPE 6: Cliquer "Demande d'autorisation" pour voir les unités
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
          units: 1 // Valeur par défaut
        };
      }

      // ÉTAPE 7: Attendre page formulaire et extraire unités
      try {
        await Promise.race([
          scPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
          scPage.waitForTimeout(15000)
        ]);
      } catch (err) {
        // Continuer même si timeout
      }

      await scPage.waitForTimeout(2000);

      const units = await scPage.evaluate(() => {
        const bodyText = document.body.innerText;
        const unitsMatch = bodyText.match(/au\s+moins\s+(\d+)\s+unités/i);
        return unitsMatch ? parseInt(unitsMatch[1]) : 1;
      });

      const restriction = {
        isRestricted: true,
        type: restrictionInfo.type,
        approvalText: restrictionInfo.approvalText,
        units
      };

      // Ajouter l'ASIN au résultat
      return {
        ...restriction,
        asin
      };

    } catch (err) {
      throw err;
    } finally {
      // Toujours fermer la page, même en cas d'erreur
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
   * Sauvegarder restriction en DB (restreint OU non restreint)
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

module.exports = new ScraperV2();
