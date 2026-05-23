#!/usr/bin/env node
/**
 * Test de la détection automatique PL chinois
 */

const brands = [
  'YANJINGHE', 'WYRIAZA', 'AUYAO', 'Dhqkqg', 'Fycooler', 'Mtsooning', 'Kekeso',
  'PATIFEED', 'Jradse', "RUBIE'S", 'shownicer', 'Lexibook', 'YOTO', 'B. toys',
  'XSHOT', 'Blumuze', 'Lito Angels', 'TOEY PLAY', 'ANSTEN', 'Blumie Shop',
  'Fehn', 'Avalon Hill', 'GAN cube', 'Rolife', 'FIESTAS GUIRCA'
];

function isSuspiciousChineseBrand(brand) {
  if (!brand || brand.length < 4) return false;

  // Ignorer marques avec espaces (noms composés légitimes)
  if (brand.includes(' ')) return false;

  const upper = brand.toUpperCase();

  // Whitelist: marques connues légitimes qui pourraient matcher les patterns
  const knownLegit = ['LEGO', 'NERF', 'HASBRO', 'FISHER', 'PRICE'];
  if (knownLegit.some(w => upper.includes(w))) return false;

  // Pattern 1: Consonnes rares typiques PL chinois (Y, Z, W, Q, X en début)
  const rareConsonants = ['Y', 'Z', 'W', 'Q', 'X'];
  const startsWithRare = rareConsonants.some(c => upper.startsWith(c));

  // Pattern 2: Ratio voyelles/consonnes suspect
  const vowels = (upper.match(/[AEIOU]/g) || []).length;
  const letters = (upper.match(/[A-Z]/g) || []).length;
  const vowelRatio = vowels / letters;

  // Pattern 3: Consonnes multiples au début (Mtsooning, Jradse)
  const startsWithMultipleConsonants = /^[BCDFGHJKLMNPQRSTVWXYZ]{3,}/.test(upper);

  // Pattern 4: Nom incompréhensible (consonnes groupées bizarres)
  const hasWeirdPattern = /[BCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(upper) || // 4+ consonnes consécutives
                          /[QX][^UAEIOU]/.test(upper) || // Q/X pas suivi de voyelle
                          /TSN|KQG|NTSN|DSE/.test(upper); // Séquences improbables

  // Pattern 5: Tout en majuscules, court, peu de voyelles
  const allCaps = brand === upper && brand.length >= 5 && brand.length <= 10;
  const commonWords = ['TECH', 'SHOP', 'PLAY', 'TOYS', 'BABY', 'KIDS', 'HOME', 'PRO', 'MAX', 'PLUS', 'STAR'];
  const hasCommonWord = commonWords.some(w => upper.includes(w));

  // Détection ultra-agressive pour noms incompréhensibles
  if (startsWithRare && vowelRatio < 0.4) return true; // YANJINGHE, WYRIAZA, XSHOT
  if (hasWeirdPattern) return true; // Dhqkqg, Mtsooning
  if (startsWithMultipleConsonants && vowelRatio < 0.35) return true; // Jradse
  if (allCaps && !hasCommonWord && vowelRatio < 0.4) return true; // AUYAO, PATIFEED, ANSTEN
  if (allCaps && brand.length <= 7 && vowelRatio < 0.45) return true; // Kekeso

  return false;
}

console.log('🔍 Test détection PL chinois\n');
console.log('Marque'.padEnd(20) + 'Résultat');
console.log('='.repeat(40));

brands.forEach(brand => {
  const suspicious = isSuspiciousChineseBrand(brand);
  const icon = suspicious ? '🤖 PL CHINOIS' : '✅ OK';
  console.log(brand.padEnd(20) + icon);
});
