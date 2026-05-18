const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { chromium } = require('playwright');

const categoryMapping = require('../config/fnac-categories');
const supabase = require('../config/supabase');

/**
 * SCRAPER HYBRIDE V4
 * - Puppeteer pour FNAC Pro (stable, fonctionne déjà)
 * - Playwright pour Seller Central (meilleur support iframes/Shadow DOM)
 */
class ScraperHybrid {
  constructor() {
    this.puppeteerBrowser = null;
    this.playwrightContext = null;
    this.fnacPage = null; // Page FNAC (Puppeteer)
    this.sellerCentralPage = null; // Page Seller Central (Playwright) - gardée ouverte
  }

  async init() {
    if (!this.puppeteerBrowser) {
      // PUPPETEER pour FNAC
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

      this.fnacPage = await this.puppeteerBrowser.newPage();
      await this.fnacPage.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      );
    }

    // PLAYWRIGHT pour Seller Central (initialisé à la demande)
  }

  async close() {
    if (this.puppeteerBrowser) {
      await this.puppeteerBrowser.close();
      this.puppeteerBrowser = null;
      this.fnacPage = null;
    }
    if (this.playwrightContext) {
      await this.playwrightContext.close();
      this.playwrightContext = null;
    }
  }

  /**
   * Workflow principal: FNAC (Puppeteer) → Seller Central (Playwright)
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

      // Naviguer vers FNAC Pro avec filtres (PUPPETEER)
      await this.navigateToFnacWithFilters(catConfig, maxPrice);

      let productsOnPage = 0;
      let loadMoreClicks = 0;
      const MAX_LOAD_MORE = 2;

      while (totalProcessed < MAX_PRODUCTS && loadMoreClicks <= MAX_LOAD_MORE) {
        // Extraire les liens produits (PUPPETEER)
        const productLinks = await this.fnacPage.evaluate(() => {
          return Array.from(document.querySelectorAll('a.Article-title')).map(a => ({
            title: a.innerText.trim(),
            url: a.href
          }));
        });

        console.log(`   📋 ${productLinks.length} produits visibles sur la page`);

        for (let i = productsOnPage; i < productLinks.length && totalProcessed < MAX_PRODUCTS; i++) {
          const product = productLinks[i];
          totalProcessed++;
          productsOnPage++;

          console.log(`\n   [${totalProcessed}/60] ${product.title.substring(0, 50)}...`);

          try {
            // ÉTAPE 1: Récupérer prix + EAN (PUPPETEER)
            const productData = await this.getProductDetails(product.url);

            if (!productData) {
              console.log(`      ✗ Données manquantes (prix ou EAN)`);
              continue;
            }

            // ÉTAPE 2: Sauvegarder produit
            const savedProduct = await this.saveProduct(productData);
            console.log(`      ✓ Produit sauvegardé en DB (ID: ${savedProduct.id})`);

            // ÉTAPE 3: Vérifier si EAN déjà en base (pour trouver ASIN existant)
            const existingProduct = await this.getProductByEan(productData.ean);
            let asinToCheck = null;

            if (existingProduct && existingProduct.asin) {
              asinToCheck = existingProduct.asin;
              console.log(`      ↻ EAN déjà en base, ASIN connu: ${asinToCheck}`);

              // Vérifier si restriction déjà checkée
              const existingRestriction = await this.getExistingRestriction(asinToCheck);
              if (existingRestriction) {
                console.log(`      ↻ ASIN ${asinToCheck} déjà checké, skip Seller Central`);
                continue; // Passer au produit suivant
              }
            }

            // ÉTAPE 4: Check Seller Central (PLAYWRIGHT) seulement si nécessaire
            console.log(`      ⏸️  EN ATTENTE SELLER CENTRAL - Le script est en PAUSE`);
            const restriction = await this.checkSellerCentralWithPlaywright(productData.ean);
            console.log(`      ▶️  Seller Central terminé, produit suivant...`);

            if (!restriction) {
              console.log(`      ⚠️ ASIN non trouvé, skip sauvegarde restriction`);
            } else {
              // Sauvegarder restriction
              await this.saveRestriction(restriction);

              if (restriction.isRestricted) {
                console.log(`      ✓ Restriction: ${restriction.type} - ${restriction.units} unités (ASIN: ${restriction.asin})`);
              } else {
                console.log(`      ✓ Pas de restriction (ASIN: ${restriction.asin})`);
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

          // Retour à FNAC (PUPPETEER)
          try {
            if (!this.fnacPage.isClosed()) {
              await this.fnacPage.bringToFront();
              await this.fnacPage.waitForTimeout(2000);
            }
          } catch (err) {
            console.error(`      ⚠️ Impossible de revenir à FNAC: ${err.message}`);
            this.fnacPage = await this.puppeteerBrowser.newPage();
            break;
          }
        }

        // "Voir plus d'articles" - Scroller en bas pour le rendre visible
        if (totalProcessed < MAX_PRODUCTS && loadMoreClicks < MAX_LOAD_MORE) {
          // D'abord scroller en bas de la page
          await this.fnacPage.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await this.fnacPage.waitForTimeout(2000);

          const hasMoreButton = await this.fnacPage.evaluate(() => {
            // Chercher le bouton avec la classe spécifique ou le texte
            const button = document.querySelector('.js-InfiniteScrollNextBtn') ||
                          Array.from(document.querySelectorAll('button, a')).find(
                            el => el.innerText?.trim().includes("Voir plus d'articles") ||
                                  el.innerText?.trim().includes("Voir plus")
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
   * Naviguer FNAC avec Puppeteer (CODE ORIGINAL QUI MARCHE)
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
    await this.fnacPage.waitForTimeout(3000);

    await this.fnacPage.waitForSelector('a.Article-title', { timeout: 15000 }).catch(() => {
      console.log('   ⚠️ Sélecteur a.Article-title non trouvé');
    });

    await this.fnacPage.waitForTimeout(2000);

    // Cookies
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

    // Filtres prix
    console.log(`   💶 Application filtres ≤${maxPrice}€...`);

    // DEBUG: Voir tous les labels disponibles
    const availableLabels = await this.fnacPage.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      return labels.map(l => l.innerText.trim()).filter(t => t);
    });
    console.log(`      🔍 DEBUG - Labels trouvés:`, availableLabels.slice(0, 20));

    const filtersToClick = [];

    if (maxPrice >= 10) {
      filtersToClick.push('<10€', 'De 10 à 20€');
    } else {
      filtersToClick.push('<10€');
    }

    for (const filterText of filtersToClick) {
      try {
        // Attendre que les filtres soient visibles
        await this.fnacPage.waitForTimeout(1000);

        const clicked = await this.fnacPage.evaluate((text) => {
          const labels = Array.from(document.querySelectorAll('label'));
          const label = labels.find(l => l.innerText.trim() === text);
          if (label) {
            // Cas 1: checkbox DANS le label
            let checkbox = label.querySelector('input[type="checkbox"]');

            // Cas 2: label a un attribut "for" qui pointe vers le checkbox
            if (!checkbox && label.hasAttribute('for')) {
              const checkboxId = label.getAttribute('for');
              checkbox = document.getElementById(checkboxId);
            }

            // Cas 3: checkbox juste AVANT le label (sibling)
            if (!checkbox && label.previousElementSibling?.tagName === 'INPUT') {
              checkbox = label.previousElementSibling;
            }

            if (checkbox) {
              // Forcer le clic
              checkbox.checked = true;
              checkbox.click();
              checkbox.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        }, filterText);

        if (clicked) {
          console.log(`      ✓ Filtre "${filterText}" cliqué`);
          await this.fnacPage.waitForTimeout(4000); // Attendre rechargement produits
        } else {
          console.log(`      ⚠️ Filtre "${filterText}" non trouvé`);
        }
      } catch (err) {
        console.log(`      ⚠️ Erreur filtre "${filterText}": ${err.message}`);
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
   * Récupérer prix + EAN avec Puppeteer (CODE ORIGINAL)
   */
  async getProductDetails(productUrl) {
    let productPage = null;

    try {
      // Petit délai avant de créer la page pour éviter "Requesting main frame too early"
      await new Promise(resolve => setTimeout(resolve, 1000));

      productPage = await this.puppeteerBrowser.newPage();

      // Délai après création de la page
      await productPage.waitForTimeout(500);

      await productPage.goto(productUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await productPage.waitForTimeout(3000);

      const data = await productPage.evaluate(() => {
        // Récupérer tout le texte de la page
        const bodyText = document.body.innerText;

        // Prix - chercher "X,XX € HT" ou "X,XX€ HT"
        let price = null;
        const priceMatch = bodyText.match(/(\d+,\d+)\s*€\s*HT/);
        if (priceMatch) {
          const priceText = priceMatch[1].replace(',', '.');
          price = parseFloat(priceText);
        }

        // EAN - chercher dans tout le texte
        let ean = null;

        // Chercher "Référence : XXXXXXXX" puis convertir en EAN si besoin
        const refMatch = bodyText.match(/Référence\s*:\s*(\d+)/i);
        if (refMatch) {
          const ref = refMatch[1];
          // La référence n'est pas l'EAN, chercher l'EAN ailleurs
        }

        // Chercher pattern EAN (13 chiffres)
        const eanMatch = bodyText.match(/\b(\d{13})\b/);
        if (eanMatch) {
          ean = eanMatch[1];
        }

        // Chercher dans les éléments dt/dd
        const dts = Array.from(document.querySelectorAll('dt'));
        const eanDt = dts.find(dt => dt.innerText.includes('EAN') || dt.innerText.includes('Code'));
        if (eanDt && eanDt.nextElementSibling) {
          const possibleEan = eanDt.nextElementSibling.innerText.trim().replace(/\D/g, '');
          if (possibleEan.length === 13) {
            ean = possibleEan;
          }
        }

        // Marque
        const brand = document.querySelector('[class*="brand"]')?.innerText.trim() ||
                      document.querySelector('[itemprop="brand"]')?.innerText.trim();

        // Titre
        const title = document.querySelector('h1')?.innerText.trim() ||
                      document.querySelector('[class*="title"]')?.innerText.trim();

        return { price, ean, brand, title, url: window.location.href };
      });

      if (!data.price || !data.ean) {
        return null;
      }

      return data;
    } catch (err) {
      console.log(`      ⚠️ Erreur getProductDetails: ${err.message}`);
      return null;
    } finally {
      try {
        if (productPage && !productPage.isClosed()) {
          await productPage.close();
        }
      } catch (e) {
        // Ignore si déjà fermée
      }
    }
  }

  /**
   * Check Seller Central avec PLAYWRIGHT (meilleur support iframes)
   */
  async checkSellerCentralWithPlaywright(ean) {
    // TIMER: Démarrer le chrono pour garantir 3 minutes minimum avant de retourner
    const startTime = Date.now();
    const MIN_DURATION_MS = 3 * 60 * 1000; // 3 minutes

    // Fonction helper pour attendre le temps minimum restant
    const ensureMinDuration = async () => {
      const elapsed = Date.now() - startTime;
      const remaining = MIN_DURATION_MS - elapsed;
      if (remaining > 0) {
        console.log(`      ⏰ Attente ${Math.round(remaining / 1000)}s supplémentaires pour atteindre 3 min minimum...`);
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
    };

    // Initialiser Playwright si besoin
    if (!this.playwrightContext) {
      console.log(`      🎭 Lancement Playwright avec profil séparé...`);
      this.playwrightContext = await chromium.launchPersistentContext(
        'C:\\Users\\desty\\AppData\\Local\\playwright-seller-central',
        {
          headless: false,
          channel: 'chrome',
          args: ['--no-sandbox', '--lang=fr-FR'],
          locale: 'fr-FR',
        }
      );
    }

    // Réutiliser la même page Seller Central ou en créer une nouvelle
    if (!this.sellerCentralPage || this.sellerCentralPage.isClosed()) {
      console.log(`      📄 Création page Seller Central...`);
      this.sellerCentralPage = await this.playwrightContext.newPage();

      // Vérifier login UNE SEULE FOIS au début
      const testUrl = 'https://sellercentral.amazon.fr';
      await this.sellerCentralPage.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.sellerCentralPage.waitForTimeout(3000);

      const needsLogin = await this.sellerCentralPage.evaluate(() => {
        const text = document.body.innerText;
        const url = document.URL;

        // Vérifier si on est sur une page de login OU de vérification 2FA/OTP
        return text.includes('Se connecter') ||
               text.includes('Sign in') ||
               text.includes('Vérification en deux étapes') ||
               text.includes('Two-Step Verification') ||
               text.includes('Enter OTP') ||
               text.includes('Envoi du code OTP') ||
               url.includes('/ap/signin') ||
               url.includes('/ap/mfa') ||
               url.includes('/ap/cvf') ||
               url.includes('/ap/otp');
      });

      if (needsLogin) {
        console.log(`      🔐 CONNECTE-TOI À SELLER CENTRAL + 2FA (une seule fois) !`);
        console.log(`      ⏳ J'attends max 15 minutes...`);
        console.log(`      ⏸️  FNAC EN PAUSE - Termine la connexion complète avant que FNAC reprenne`);

        const maxWait = 900000; // 15 minutes
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
          await this.sellerCentralPage.waitForTimeout(5000);

          const stillNeedsLogin = await this.sellerCentralPage.evaluate(() => {
            const text = document.body.innerText;
            const url = document.URL;

            // Vérifier si TOUJOURS sur login/2FA
            return text.includes('Se connecter') ||
                   text.includes('Sign in') ||
                   text.includes('Vérification en deux étapes') ||
                   text.includes('Two-Step Verification') ||
                   text.includes('Enter OTP') ||
                   text.includes('Envoi du code OTP') ||
                   text.includes('Processus de vérification') ||
                   url.includes('/ap/signin') ||
                   url.includes('/ap/mfa') ||
                   url.includes('/ap/cvf') ||
                   url.includes('/ap/otp');
          });

          if (!stillNeedsLogin) {
            console.log(`      ✅ Connecté à Seller Central (2FA validée) !`);
            console.log(`      ▶️  FNAC VA REPRENDRE maintenant...`);
            break;
          }
        }
      }
    }

    const scPage = this.sellerCentralPage;

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Naviguer vers le produit (on est déjà connecté)
      const url = `https://sellercentral.amazon.fr/product-search/keywords/search?q=${ean}`;
      await scPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await scPage.waitForTimeout(5000);

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
        await ensureMinDuration();
        return null;
      }

      console.log(`      🔍 Vérification restriction pour ASIN ${asin}...`);
      console.log(`      ⏳ Attente ouverture popup (20s)...`);

      // IMPORTANT: Attendre que la popup/modal s'affiche complètement
      await scPage.waitForTimeout(20000);

      console.log(`      🎯 PLAYWRIGHT: Recherche dropdown avec Shadow DOM...`);

      // PLAYWRIGHT: Gérer le Shadow DOM
      let selectFound = false;

      // Le dropdown est dans un Web Component <kat-dropdown>
      const frames = scPage.frames();
      console.log(`      📊 ${frames.length} frames trouvés`);

      for (const frame of frames) {
        try {
          // Chercher le composant kat-dropdown
          const katDropdown = await frame.locator('kat-dropdown[data-testid="conditions-dropdown"]').first();

          if (await katDropdown.count() > 0) {
            console.log(`      ✅ PLAYWRIGHT: kat-dropdown trouvé dans frame!`);

            // Étape 1: Cliquer sur le dropdown header pour ouvrir le menu
            const opened = await frame.evaluate(() => {
              const dropdown = document.querySelector('kat-dropdown[data-testid="conditions-dropdown"]');
              if (!dropdown || !dropdown.shadowRoot) return false;

              const selectHeader = dropdown.shadowRoot.querySelector('.select-header');
              if (selectHeader) {
                selectHeader.click();
                return true;
              }
              return false;
            });

            if (!opened) {
              console.log(`      ⚠️ Impossible d'ouvrir le dropdown`);
              continue;
            }

            console.log(`      ✓ Dropdown ouvert, recherche options...`);
            await frame.waitForTimeout(2000);

            // Étape 2: Chercher et cliquer l'option "Neuf" avec Playwright locator
            console.log(`      🔍 Recherche option "Neuf"...`);

            // Méthode 1: Via locator Playwright (plus fiable)
            let neufClicked = false;

            try {
              // Chercher un élément contenant exactement "Neuf" (visible)
              const neufOption = await frame.locator('text="Neuf"').first();

              if (await neufOption.count() > 0 && await neufOption.isVisible()) {
                await neufOption.click();
                console.log(`      ✓ Option "Neuf" cliquée (via locator)`);
                neufClicked = true;
              }
            } catch (err) {
              console.log(`      ⚠️ Erreur locator: ${err.message}`);
            }

            // Méthode 2: Fallback avec evaluate si locator échoue
            if (!neufClicked) {
              neufClicked = await frame.evaluate(() => {
                // Chercher dans tous les shadow roots possibles
                const findInShadow = (root) => {
                  if (!root) return null;

                  // Chercher kat-menu-option ou éléments similaires
                  const options = root.querySelectorAll('kat-menu-option, [role="option"], li, div[class*="option"], button, span');
                  for (const option of options) {
                    const text = (option.textContent || option.innerText || '').trim();
                    if (text === 'Neuf' || text === 'New') {
                      return option;
                    }

                    // Chercher aussi dans le shadow root de l'option
                    if (option.shadowRoot) {
                      const found = findInShadow(option.shadowRoot);
                      if (found) return found;
                    }
                  }
                  return null;
                };

                // Chercher dans le shadow root du dropdown
                const dropdown = document.querySelector('kat-dropdown[data-testid="conditions-dropdown"]');
                if (dropdown && dropdown.shadowRoot) {
                  const neufOption = findInShadow(dropdown.shadowRoot);
                  if (neufOption) {
                    neufOption.click();
                    return true;
                  }
                }

                // Chercher aussi dans le document principal (overlay peut être hors du shadow)
                const neufOption = findInShadow(document);
                if (neufOption) {
                  neufOption.click();
                  return true;
                }

                return false;
              });

              if (neufClicked) {
                console.log(`      ✓ Option "Neuf" sélectionnée (via evaluate)`);
              }
            }

            if (!neufClicked) {
              console.log(`      ⚠️ Option "Neuf" non trouvée dans le menu`);
              continue;
            }

            // Attendre que le dropdown se ferme et que le bouton apparaisse
            console.log(`      ⏳ Attente 5s que le bouton apparaisse...`);
            await frame.waitForTimeout(5000);

            // Étape 3: Chercher le bouton "Vendre ce produit" ou "Demande de vente"
            console.log(`      🔍 Recherche bouton vente dans le frame...`);

            // Méthode 1: Chercher par TEXTE visible - essayer les 2 variantes
            let sellButton = await frame.getByText('Vendre ce produit', { exact: false });

            if (await sellButton.count() === 0) {
              sellButton = await frame.getByText('Demande de vente', { exact: false });
            }

            if (await sellButton.count() > 0) {
              console.log(`      ✓ Bouton trouvé via texte, clic...`);
              await sellButton.click();
              console.log(`      ✓ Bouton vente cliqué !`);
              selectFound = true;
              break;
            }

            console.log(`      ⚠️ Méthode 1 échouée, essai méthode 2...`);

            // Méthode 2: Chercher dans TOUS les kat-button du frame
            const buttonClicked = await frame.evaluate(() => {
              const allKatButtons = document.querySelectorAll('kat-button');
              for (const katButton of allKatButtons) {
                const text = katButton.innerText || katButton.textContent || '';
                if (text.includes('Vendre ce produit') ||
                    text.includes('Demande de vente') ||
                    text.includes('Demande d\'autorisation') ||
                    text.includes('Sell this product')) {
                  // Chercher le button dans le shadow root
                  if (katButton.shadowRoot) {
                    const btn = katButton.shadowRoot.querySelector('button');
                    if (btn) {
                      btn.click();
                      return true;
                    }
                  }
                  // Sinon cliquer le kat-button directement
                  katButton.click();
                  return true;
                }
              }
              return false;
            });

            if (buttonClicked) {
              console.log(`      ✓ Bouton vente cliqué (via evaluate) !`);
              selectFound = true;
              break;
            }

            // Sinon chercher dans tous les autres frames
            for (const otherFrame of frames) {
              try {
                // Par data-testid
                sellButton = await otherFrame.locator('kat-button[data-testid="apply-to-sell"], button[data-testid="apply-to-sell"]').first();
                if (await sellButton.count() > 0) {
                  await sellButton.click();
                  console.log(`      ✓ Bouton "Demande de vente" cliqué (autre frame via testid)`);
                  selectFound = true;
                  break;
                }

                // Par texte
                sellButton = await otherFrame.locator('kat-button:has-text("Demande de vente"), button:has-text("Demande de vente")').first();
                if (await sellButton.count() > 0) {
                  await sellButton.click();
                  console.log(`      ✓ Bouton "Demande de vente" cliqué (autre frame via texte)`);
                  selectFound = true;
                  break;
                }
              } catch (err) {
                continue;
              }
            }

            // Si trouvé, sortir de la boucle principale
            if (selectFound) break;

            // Sinon chercher dans la page principale
            // D'abord par texte
            sellButton = await scPage.getByText('Vendre ce produit', { exact: false });
            if (await sellButton.count() === 0) {
              sellButton = await scPage.getByText('Demande de vente', { exact: false });
            }

            if (await sellButton.count() > 0) {
              await sellButton.click();
              console.log(`      ✓ Bouton vente cliqué (page principale par texte)`);
              selectFound = true;
              break;
            }

            // Puis par testid
            sellButton = await scPage.locator('kat-button[data-testid="apply-to-sell"], button[data-testid="apply-to-sell"]').first();
            if (await sellButton.count() > 0) {
              await sellButton.click();
              console.log(`      ✓ Bouton vente cliqué (page principale par testid)`);
              selectFound = true;
              break;
            }

            console.log(`      ⚠️ Bouton "Demande de vente" non trouvé nulle part`);
          }
        } catch (err) {
          // Frame n'a pas le composant
          continue;
        }
      }

      if (!selectFound) {
        console.log(`      ⚠️ PLAYWRIGHT: Dropdown ou bouton non trouvé`);
        await ensureMinDuration();
        return null;
      }

      // Attendre navigation vers la page de restriction ou listing
      console.log(`      ⏳ Attente navigation après clic...`);
      let navigationSuccess = false;

      // D'abord, vérifier si une NOUVELLE page a été créée (nouveau tab)
      await scPage.waitForTimeout(2000); // Attendre 2s que la nouvelle page se crée
      const context = scPage.context();
      const allPages = context.pages();
      console.log(`      📊 ${allPages.length} pages dans le contexte`);

      // Créer une nouvelle variable pour la page active (peut être l'ancienne ou la nouvelle)
      let currentPage = scPage;

      if (allPages.length > 1) {
        // Nouvelle page créée ! Basculer vers la dernière page
        currentPage = allPages[allPages.length - 1];
        console.log(`      ✅ Nouvelle page détectée! Basculement...`);
        console.log(`      📍 URL nouvelle page: ${currentPage.url()}`);
      }

      // Attendre la navigation (peut être même page ou nouvelle page)
      {
        try {
          // Attendre que l'URL change vers la page de restriction ou listing
          await currentPage.waitForURL(url =>
            url.includes('/hz/approvalrequest/restrictions/approve') ||
            url.includes('/interactive/listing/workflow/offer'),
            { timeout: 45000 }
          );
          console.log(`      ✓ Navigation complète vers page restriction/listing`);
          navigationSuccess = true;
        } catch (err) {
          console.log(`      ⚠️ Timeout 45s, vérification manuelle de l'URL...`);
          // Vérifier l'URL en boucle pendant 30s supplémentaires
          const maxRetries = 6; // 6 x 5s = 30s
          for (let i = 0; i < maxRetries; i++) {
            await currentPage.waitForTimeout(5000);

            const currentUrl = currentPage.url();
            console.log(`      🔍 Tentative ${i+1}/${maxRetries}: ${currentUrl}`);
            if (currentUrl.includes('/hz/approvalrequest/restrictions/approve') ||
                currentUrl.includes('/interactive/listing/workflow/offer')) {
              console.log(`      ✓ Navigation réussie (après ${i+1} tentatives)`);
              navigationSuccess = true;
              break;
            }
          }
        }

        // Attendre que le DOM se charge
        if (navigationSuccess) {
          try {
            await currentPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
          } catch (err) {
            await currentPage.waitForTimeout(2000);
          }
        }
      }

      const currentUrl = currentPage.url();
      console.log(`      📍 URL finale: ${currentUrl}`);

      // Libre ou restreint ?
      if (currentUrl.includes('/interactive/listing/workflow/offer')) {
        // Produit libre → retour immédiat, pas besoin d'attendre 3min
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
        await ensureMinDuration();
        return null;
      }

      // Extraire restriction (marque + catégorie bonus éventuelle)
      console.log(`      🔍 Extraction infos restriction...`);
      const restrictionInfo = await currentPage.evaluate(() => {
        const bodyText = document.body.innerText;
        let type = null;
        let approvalText = '';
        let bonusCategory = null;

        // Chercher "Marque XXX en état(s)..."
        const brandMatch = bodyText.match(/Marque\s+([^en]+?)\s+en\s+état/i);
        if (brandMatch) {
          type = 'BRAND';
          approvalText = brandMatch[1].trim();

          // Vérifier s'il y a aussi une catégorie (après "Marque")
          const categoryBonusMatch = bodyText.match(/Autre\s+Catégorie\s+([^en]+?)\s+en\s+état/i);
          if (categoryBonusMatch) {
            bonusCategory = categoryBonusMatch[1].trim();
          }
        } else {
          // Sinon c'est juste une catégorie
          const categoryMatch = bodyText.match(/Catégorie\s+([^en]+?)\s+en\s+état/i);
          if (categoryMatch) {
            type = 'CATEGORY';
            approvalText = categoryMatch[1].trim();
          }
        }

        return { type, approvalText, bonusCategory };
      });

      if (!restrictionInfo.type) {
        console.log(`      ⚠️ Type de restriction non détecté`);
        await ensureMinDuration();
        return null;
      }

      console.log(`      ✓ Type: ${restrictionInfo.type} - ${restrictionInfo.approvalText}`);
      if (restrictionInfo.bonusCategory) {
        console.log(`      🎁 Bonus catégorie: ${restrictionInfo.bonusCategory}`);
      }

      // Cliquer "Demande d'autorisation"
      console.log(`      🔍 Recherche bouton "Demande d'autorisation"...`);
      const approvalClicked = await currentPage.evaluate(() => {
        // Chercher dans tous les éléments cliquables
        const allElements = Array.from(document.querySelectorAll('button, span, a, input[type="submit"]'));
        const approvalButton = allElements.find(el => {
          const text = el.innerText || el.textContent || '';
          return text.includes("Demande d'autorisation") || text.includes("Demande d'autorisation");
        });

        if (approvalButton) {
          approvalButton.click();
          return true;
        }
        return false;
      });

      if (!approvalClicked) {
        console.log(`      ⚠️ Bouton "Demande d'autorisation" non trouvé`);
        // Infos extraites, on peut retourner immédiatement
        return {
          isRestricted: true,
          type: restrictionInfo.type,
          approvalText: restrictionInfo.approvalText,
          bonusCategory: restrictionInfo.bonusCategory,
          units: 1,
          asin
        };
      }

      console.log(`      ✓ Bouton "Demande d'autorisation" cliqué`);

      // Attendre la page avec le nombre d'unités
      console.log(`      ⏳ Attente page nombre d'unités...`);
      try {
        await currentPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
      } catch (err) {
        await currentPage.waitForTimeout(3000);
      }

      // Extraire le nombre d'unités requis
      console.log(`      🔍 Extraction nombre d'unités...`);
      const units = await currentPage.evaluate(() => {
        const bodyText = document.body.innerText;

        // Chercher "au moins X unités"
        const unitsMatch = bodyText.match(/au\s+moins\s+(\d+)\s+unités/i);
        if (unitsMatch) {
          return parseInt(unitsMatch[1]);
        }

        // Alternative: chercher juste un nombre suivi de "unités"
        const altMatch = bodyText.match(/(\d+)\s+unités/i);
        if (altMatch) {
          return parseInt(altMatch[1]);
        }

        return 1; // Par défaut
      });

      console.log(`      ✓ Nombre d'unités: ${units}`);

      // Succès complet → retour immédiat
      return {
        isRestricted: true,
        type: restrictionInfo.type,
        approvalText: restrictionInfo.approvalText,
        bonusCategory: restrictionInfo.bonusCategory,
        units,
        asin
      };

    } catch (err) {
      console.error(`      ❌ Erreur dans checkSellerCentralWithPlaywright: ${err.message}`);
      await ensureMinDuration();
      throw err;
    }
    // NE PAS fermer la page - on la réutilise pour les produits suivants
  }

  async saveProduct(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        title: productData.title || 'Sans titre',
        brand: productData.brand || 'Unknown',
        price: productData.price,
        ean: productData.ean,
        url: productData.url,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async saveRestriction(restriction) {
    // Concaténer bonusCategory dans approval_text si présent
    let approvalTextFull = restriction.approvalText;
    if (restriction.bonusCategory) {
      approvalTextFull += ` + BONUS: ${restriction.bonusCategory}`;
    }

    const { error } = await supabase
      .from('restrictions')
      .insert({
        asin: restriction.asin,
        is_restricted: restriction.isRestricted,
        units_required: restriction.units,
        approval_text: approvalTextFull,
        type: restriction.type,
      });

    if (error) throw error;
  }

  async getExistingRestriction(asin) {
    const { data } = await supabase
      .from('restrictions')
      .select('*')
      .eq('asin', asin)
      .single();

    return data;
  }

  async getProductByEan(ean) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('ean', ean)
      .single();

    return data;
  }
}

module.exports = new ScraperHybrid();
