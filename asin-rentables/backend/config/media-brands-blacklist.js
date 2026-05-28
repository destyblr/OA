/**
 * BLACKLIST MARQUES MÉDIAS
 *
 * Ces marques sont gardées en cache (base de données) mais:
 * - Filtrées côté frontend (ne s'affichent pas)
 * - Skippées automatiquement lors des futurs scans (cache EAN)
 */

module.exports = {
  // ÉDITEURS LIVRES
  books: [
    'Livre de Poche',
    'LEDUC.S EDITIONS',
    'Marabout',
    'Gallimard',
    'Actes Sud',
    'J\'AI LU',
    'TASCHEN',
    'LIBERTALIA',
    'KIMANE',
    'Fleurus',
    'Hachette India',
    'Odile Jacob',
    'PAYOT',
    'Points',
    'GIBOULÉES',
    'Gautier Languereau',
    'Nobi Nobi',
    'RIVAGES',
    'DESCLÉE DE BROUWER',
    'Louverture',
    'DRAGON D\'OR',
    'OMAKE BOOKS',
    'Eyrolles',
    'DE LA MARTINIÈRE JEUNESSE',
    'Quelle Histoire',
    'AUZOU',
    'Livres de collection',
    'IGN'
  ],

  // LABELS MUSIQUE / CD
  music: [
    'Warner Music',
    'Island',
    'Imports',
    'COOKING VINYL',
    '4 A D',
    'UNIVERSAL MUSIC GROUP',
    'Verycords',
    'PIAS',
    'Sony Music',
    'EMI',
    'Columbia',
    'Atlantic'
  ],

  // DISTRIBUTEURS DVD / BLU-RAY
  video: [
    'Seven 7',
    'PATHE',
    'Warner Bros',
    'Universal Pictures',
    'Paramount'
  ],

  // MARQUES MIXTES (parfois médias)
  mixed: [
    'Disney' // Peut être DVD/CD ou jouets
  ],

  // Fonction helper: vérifier si une marque est dans la blacklist
  isMediaBrand(brandName) {
    if (!brandName) return false;

    const brand = brandName.trim();
    const allBrands = [
      ...this.books,
      ...this.music,
      ...this.video,
      ...this.mixed
    ];

    return allBrands.some(b =>
      b.toLowerCase() === brand.toLowerCase() ||
      brand.toLowerCase().includes(b.toLowerCase())
    );
  }
};
