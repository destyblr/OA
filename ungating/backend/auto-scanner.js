#!/usr/bin/env node
/**
 * Scanner automatique avec rotation sur toutes les catégories
 * Lance un scan toutes les ~55 minutes (temps de recharge tokens)
 * Vérifie les tokens avant chaque scan
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const BrandFinder = require('./services/brand-finder');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;
const ROTATIONS_PATH = path.join(__dirname, 'config/rotations.json');
const STATE_PATH = path.join(__dirname, 'data/scanner-state.json');

// État du scanner
let currentRotationIndex = 0;
let rotations = [];
let isRunning = false;

/**
 * Charger les rotations
 */
function loadRotations() {
  try {
    rotations = JSON.parse(fs.readFileSync(ROTATIONS_PATH, 'utf8'));
    console.log(`📋 ${rotations.length} rotations chargées`);
  } catch (error) {
    console.error('❌ Impossible de charger rotations.json:', error.message);
    process.exit(1);
  }
}

/**
 * Charger l'état sauvegardé
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      currentRotationIndex = state.currentRotationIndex || 0;
      console.log(`📂 État chargé: rotation ${currentRotationIndex + 1}/${rotations.length}`);
    }
  } catch (error) {
    console.warn('⚠️  Impossible de charger l\'état, démarrage depuis le début');
    currentRotationIndex = 0;
  }
}

/**
 * Sauvegarder l'état
 */
function saveState() {
  try {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_PATH, JSON.stringify({
      currentRotationIndex,
      lastScan: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    console.warn('⚠️  Impossible de sauvegarder l\'état:', error.message);
  }
}

/**
 * Vérifier les tokens Keepa disponibles
 */
async function checkTokens() {
  try {
    const response = await axios.get('https://api.keepa.com/token', {
      params: { key: KEEPA_API_KEY }
    });
    return response.data.tokensLeft;
  } catch (error) {
    console.error('❌ Erreur vérification tokens:', error.message);
    return 0;
  }
}

/**
 * Attendre jusqu'à avoir assez de tokens
 */
async function waitForTokens(needed = 52) {
  while (true) {
    const available = await checkTokens();

    if (available >= needed) {
      console.log(`✅ ${available} tokens disponibles (besoin: ${needed})`);
      return available;
    }

    const missing = needed - available;
    const waitMinutes = Math.ceil(missing / 1); // 1 token/min
    console.log(`⏳ Pas assez de tokens (${available}/${needed}). Attente ${waitMinutes} min...`);

    // Attendre 2 minutes avant de revérifier
    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
  }
}

/**
 * Lancer un scan pour une rotation
 */
async function runScan(rotation) {
  console.log('\n' + '='.repeat(70));
  console.log(`🚀 SCAN AUTO: ${rotation.name}`);
  console.log('='.repeat(70));
  console.log(`📍 Rotation ${currentRotationIndex + 1}/${rotations.length}`);
  console.log(`📦 Catégorie: ${rotation.category}`);
  console.log(`📊 BSR: ${rotation.bsrMin.toLocaleString()}-${rotation.bsrMax.toLocaleString()}`);
  console.log(`💰 Prix: ${rotation.priceMin}€-${rotation.priceMax}€`);
  console.log(`👥 Max vendeurs: ${rotation.maxSellers}`);
  console.log('');

  try {
    const finder = new BrandFinder();

    // Passer directement l'objet rotation avec les bonnes propriétés
    const config = {
      name: rotation.name,
      category: rotation.category,
      bsrMin: rotation.bsrMin,
      bsrMax: rotation.bsrMax,
      priceMin: rotation.priceMin,
      priceMax: rotation.priceMax,
      maxSellers: rotation.maxSellers,
      tokensPerScan: rotation.tokensPerScan,
      excludeAmazon: true
    };

    await finder.runScanWithConfig(config);

    console.log('\n✅ Scan terminé avec succès!');
    return true;
  } catch (error) {
    console.error('\n❌ Erreur scan:', error.message);
    return false;
  }
}

/**
 * Boucle principale du scanner
 */
async function mainLoop() {
  console.log('\n🤖 SCANNER AUTOMATIQUE DÉMARRÉ');
  console.log('='.repeat(70));
  console.log(`📅 Démarrage: ${new Date().toLocaleString('fr-FR')}`);
  console.log(`🔄 ${rotations.length} rotations à scanner`);
  console.log(`⏱️  Intervalle: ~55 min entre chaque scan`);
  console.log('='.repeat(70));

  isRunning = true;

  while (isRunning) {
    const rotation = rotations[currentRotationIndex];

    // 1. Vérifier/Attendre tokens
    await waitForTokens(rotation.tokensPerScan);

    // 2. Lancer scan
    const success = await runScan(rotation);

    // 3. Passer à la rotation suivante
    currentRotationIndex = (currentRotationIndex + 1) % rotations.length;
    saveState();

    // 4. Si fin de cycle, afficher résumé
    if (currentRotationIndex === 0) {
      console.log('\n' + '='.repeat(70));
      console.log('🎯 CYCLE COMPLET TERMINÉ!');
      console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
      console.log('🔄 Redémarrage du cycle...');
      console.log('='.repeat(70));
    }

    // 5. Attendre avant le prochain scan
    if (success && currentRotationIndex !== 0) {
      console.log('\n⏳ Attente 55 minutes avant le prochain scan...\n');
      await new Promise(resolve => setTimeout(resolve, 55 * 60 * 1000));
    }
  }
}

/**
 * Gestion arrêt propre
 */
function handleShutdown(signal) {
  console.log(`\n\n⚠️  Signal ${signal} reçu. Arrêt en cours...`);
  isRunning = false;
  saveState();
  console.log('💾 État sauvegardé');
  console.log(`📍 Prochain scan: Rotation ${currentRotationIndex + 1}/${rotations.length}`);
  console.log('👋 Au revoir!\n');
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Démarrage
loadRotations();
loadState();
mainLoop();
