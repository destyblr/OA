/**
 * Mapping des catégories dashboard → FNAC Pro
 *
 * Types de scraping:
 * - "search": Utilise la barre de recherche + mot-clé
 * - "url": URL directe vers une page spécifique
 */

module.exports = {
  baby: {
    label: "Bébé",
    type: "search",
    keyword: "bebe",
    // Produits: couches, biberons, poussettes, jouets d'éveil
  },

  toys: {
    label: "Jouets",
    type: "search",
    keyword: "jouet",
    // Produits: jouets, peluches, jeux de société
  },

  health: {
    label: "Hygiène & Santé",
    type: "search",
    keyword: "hygiene",
    // Produits: brosses à dents, dentifrice, shampoing, savon
  },

  pet: {
    label: "Animalerie",
    type: "search",
    keyword: "chat chien",
    // Produits: nourriture animaux, accessoires, jouets pour animaux
  },

  grocery: {
    label: "Alimentation",
    type: "search",
    keyword: "nourriture",
    // Produits: épicerie, snacks, boissons
  },

  home: {
    label: "Maison",
    type: "search",
    keyword: "maison",
    // Produits: déco, cuisine, rangement
  },

  beauty: {
    label: "Beauté (avec filtres)",
    type: "search",
    keyword: "beaute",
    // NOTE: Utiliser avec prudence (beaucoup de CD/magazines)
  }
};
