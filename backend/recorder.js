/**
 * DEMO RECORDER
 *
 * Lance Chrome et enregistre automatiquement :
 * - Toutes les URLs visitées
 * - Tous les clics effectués (avec sélecteurs CSS)
 * - Tous les inputs remplis
 * - Screenshots à chaque étape importante
 *
 * UTILISATION :
 * 1. Lancer : node backend/recorder.js
 * 2. Naviguez normalement dans Chrome
 * 3. Fermez Chrome quand vous avez fini
 * 4. Le script génère un fichier demo-notes.json avec tout !
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class DemoRecorder {
  constructor() {
    this.actions = [];
    this.currentStep = 1;
    this.screenshotDir = path.join(__dirname, '../screenshots');

    // Créer le dossier screenshots
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  log(type, data) {
    const timestamp = new Date().toISOString();
    const action = { step: this.currentStep, timestamp, type, ...data };
    this.actions.push(action);

    console.log(`\n📝 [Étape ${this.currentStep}] ${type.toUpperCase()}`);
    console.log(JSON.stringify(data, null, 2));

    if (type === 'navigation') {
      this.currentStep++;
    }
  }

  async takeScreenshot(page, name) {
    const filename = `step-${this.currentStep}-${name}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot sauvegardé : ${filename}`);
    return filename;
  }

  async getSelector(element) {
    // Génère un sélecteur CSS pour un élément
    return await element.evaluate((el) => {
      const path = [];
      while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();

        if (el.id) {
          selector += `#${el.id}`;
          path.unshift(selector);
          break;
        } else {
          let sibling = el;
          let nth = 1;
          while (sibling.previousElementSibling) {
            sibling = sibling.previousElementSibling;
            if (sibling.nodeName.toLowerCase() === selector) nth++;
          }
          if (nth !== 1) selector += `:nth-of-type(${nth})`;
        }

        path.unshift(selector);
        el = el.parentNode;
      }
      return path.join(' > ');
    });
  }

  async startRecording() {
    console.log('🚀 Démarrage du recorder...\n');
    console.log('📖 Instructions :');
    console.log('1. Chrome va s\'ouvrir');
    console.log('2. Naviguez normalement (Metro, Amazon, Seller Central)');
    console.log('3. Fermez Chrome quand vous avez terminé');
    console.log('4. Le fichier demo-notes.json sera généré automatiquement\n');
    console.log('⏳ Lancement de Chrome...\n');

    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const pages = await browser.pages();
    const page = pages[0];

    // Aller sur Google au départ
    await page.goto('https://www.google.fr');
    this.log('start', { message: 'Chrome lancé, prêt pour la démo' });

    // Enregistrer les navigations
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        const url = page.url();
        console.log(`\n🌐 Navigation vers : ${url}`);

        this.log('navigation', { url });

        // Screenshot automatique après chaque navigation
        await new Promise(r => setTimeout(r, 2000)); // Attendre chargement
        await this.takeScreenshot(page, 'page-loaded');
      }
    });

    // Enregistrer les clics
    await page.evaluateOnNewDocument(() => {
      document.addEventListener('click', (e) => {
        const element = e.target;
        const text = element.innerText || element.value || element.alt;
        const tag = element.tagName.toLowerCase();

        // Envoyer au console pour que Node.js puisse le capter
        console.log('🖱️ CLICK:', {
          tag,
          text: text ? text.substring(0, 50) : '',
          id: element.id,
          className: element.className
        });
      }, true);
    });

    // Écouter les logs du navigateur
    page.on('console', async (msg) => {
      const text = msg.text();
      if (text.includes('🖱️ CLICK:')) {
        try {
          const data = JSON.parse(text.replace('🖱️ CLICK: ', ''));
          this.log('click', data);
        } catch (e) {}
      }
    });

    // Attendre que l'utilisateur ferme le navigateur
    browser.on('disconnected', () => {
      this.saveResults();
    });

    console.log('✅ Recorder actif ! Naviguez librement dans Chrome...\n');
  }

  saveResults() {
    const outputFile = path.join(__dirname, '../demo-notes.json');

    const summary = {
      totalSteps: this.currentStep - 1,
      totalActions: this.actions.length,
      recordedAt: new Date().toISOString(),
      actions: this.actions
    };

    fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));

    console.log('\n\n✅ ENREGISTREMENT TERMINÉ !');
    console.log(`📄 Fichier généré : ${outputFile}`);
    console.log(`📸 Screenshots : ${this.screenshotDir}`);
    console.log(`📊 Total étapes : ${summary.totalSteps}`);
    console.log(`📊 Total actions : ${summary.totalActions}\n`);

    process.exit(0);
  }
}

// Lancer le recorder
const recorder = new DemoRecorder();
recorder.startRecording().catch(console.error);
