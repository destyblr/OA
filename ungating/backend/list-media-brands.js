// Lister les marques médias (musique/vidéo) en base
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

(async () => {
  console.log('\n🎵 MARQUES MÉDIAS EN BASE\n');

  try {
    // Récupérer toutes les restrictions avec leurs produits
    const { data: restrictions, error } = await supabase
      .from('restrictions')
      .select(`
        *,
        products!inner(*)
      `)
      .eq('is_restricted', true);

    if (error) throw error;

    // Grouper par marque (approval_text)
    const brandCounts = {};
    const mediaKeywords = ['cd', 'dvd', 'blu-ray', 'album', 'film', 'movie', 'music'];

    restrictions.forEach(r => {
      const brand = r.approval_text || 'Unknown';
      const title = (r.products.title || '').toLowerCase();

      // Détecter si c'est un média
      const isMedia = mediaKeywords.some(kw => title.includes(kw));

      if (!brandCounts[brand]) {
        brandCounts[brand] = { total: 0, media: 0 };
      }

      brandCounts[brand].total++;
      if (isMedia) brandCounts[brand].media++;
    });

    // Afficher les marques avec beaucoup de médias
    console.log('Marques avec produits médias:\n');

    Object.entries(brandCounts)
      .filter(([brand, counts]) => counts.media > 0)
      .sort((a, b) => b[1].media - a[1].media)
      .forEach(([brand, counts]) => {
        const percent = Math.round((counts.media / counts.total) * 100);
        console.log(`${brand}: ${counts.media}/${counts.total} médias (${percent}%)`);
      });

    console.log('\n✅ Terminé\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
})();
