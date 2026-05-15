/**
 * Mapping des catégories dashboard → FNAC Pro
 *
 * Types de scraping:
 * - "search": Utilise la barre de recherche + mot-clé
 * - "url": URL directe vers une page spécifique
 */

module.exports = {
  toys: {
    label: "Jouets",
    type: "search",
    keyword: "jouet",
    // URL construite dynamiquement: https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&sft=1
  },

  beauty: {
    label: "Beauté",
    type: "url",
    url: "https://www.fnacpro.com/Tous-les-bons-plans-Beaute-Sante-Forme/Bons-plans-Beaute-Sante-Forme/nsh530301/w-4",
    // URL directe vers la page "Bons plans Beauté Santé Forme"
  },

  home: {
    label: "Maison",
    type: "url",
    url: "https://www.fnacpro.com/SearchResult/ResultList.aspx?SCat=23!1&SDM=list&Search=maison&sft=1",
    // URL avec sous-catégorie SCat=23!1
  }
};
