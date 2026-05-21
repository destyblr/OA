// Nettoyer tous les médias (livres, CD, DVD, magazines) de la base de données
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const isMediaProduct = (product) => {
  const title = (product.title || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const ean = product.ean || '';

  // 1. Livres (ISBN)
  if (ean.startsWith('978') || ean.startsWith('979')) {
    return { isMedia: true, type: 'Livre 📚' };
  }

  // 2. CD/Musique
  const musicKeywords = [
    'cd ', ' cd', 'album', 'vinyle', 'vinyl', 'disque',
    'compilation', 'single', 'ep ', ' ep', 'soundtrack',
    'bande originale', 'best of', 'greatest hits'
  ];
  if (musicKeywords.some(kw => title.includes(kw))) {
    return { isMedia: true, type: 'CD/Musique 💿' };
  }

  // 3. DVD/Vidéo
  const videoKeywords = [
    'dvd', 'blu-ray', 'bluray', 'film', 'movie',
    'coffret', 'saison', 'season', 'série', 'series'
  ];
  if (videoKeywords.some(kw => title.includes(kw))) {
    return { isMedia: true, type: 'DVD/Vidéo 📀' };
  }

  // 4. Magazines/Presse
  const pressKeywords = [
    'magazine', 'revue', 'hors-série', 'hors serie',
    'mensuel', 'hebdo', 'quotidien', 'journal',
    'numéro', 'n°', 'édition spéciale'
  ];
  if (pressKeywords.some(kw => title.includes(kw) || brand.includes(kw))) {
    return { isMedia: true, type: 'Magazine 📰' };
  }

  const pressBrands = [
    'grazia', 'elle', 'marie claire', 'cosmopolitan',
    'vogue', 'gala', 'closer', 'voici', 'public'
  ];
  if (pressBrands.some(b => brand.includes(b))) {
    return { isMedia: true, type: 'Magazine 📰' };
  }

  return { isMedia: false };
};

(async () => {
  console.log('\n🧹 NETTOYAGE DES MÉDIAS\n');

  try {
    // 1. Récupérer tous les produits
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('*');

    if (fetchError) throw fetchError;

    console.log(`📦 ${allProducts.length} produits en base\n`);

    // 2. Identifier les médias
    const mediaProducts = [];
    const stats = { livres: 0, cd: 0, dvd: 0, magazines: 0 };

    allProducts.forEach(product => {
      const check = isMediaProduct(product);
      if (check.isMedia) {
        mediaProducts.push({ ...product, mediaType: check.type });

        if (check.type.includes('Livre')) stats.livres++;
        else if (check.type.includes('CD')) stats.cd++;
        else if (check.type.includes('DVD')) stats.dvd++;
        else if (check.type.includes('Magazine')) stats.magazines++;
      }
    });

    if (mediaProducts.length === 0) {
      console.log('✅ Aucun média trouvé dans la base\n');
      process.exit(0);
    }

    console.log(`🎯 ${mediaProducts.length} médias détectés:\n`);
    console.log(`   📚 Livres: ${stats.livres}`);
    console.log(`   💿 CD/Musique: ${stats.cd}`);
    console.log(`   📀 DVD/Vidéo: ${stats.dvd}`);
    console.log(`   📰 Magazines: ${stats.magazines}\n`);

    console.log('📋 Exemples:\n');
    mediaProducts.slice(0, 5).forEach(p => {
      console.log(`   ${p.mediaType} - ${p.title.substring(0, 50)} (EAN: ${p.ean})`);
    });

    console.log('\n⏳ Suppression en cours...\n');

    const productIds = mediaProducts.map(p => p.id);

    // 3. Supprimer les opportunities liées
    const { error: oppError } = await supabase
      .from('opportunities')
      .delete()
      .in('product_id', productIds);

    if (oppError) {
      console.log(`   ⚠️ Erreur opportunities: ${oppError.message}`);
    } else {
      console.log(`   ✅ Opportunities supprimées`);
    }

    // 4. Supprimer les produits
    const { error: prodError } = await supabase
      .from('products')
      .delete()
      .in('id', productIds);

    if (prodError) {
      console.log(`   ❌ Erreur products: ${prodError.message}`);
    } else {
      console.log(`   ✅ Produits supprimés`);
    }

    console.log(`\n✅ Nettoyage terminé: ${mediaProducts.length} médias supprimés\n`);
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
})();
