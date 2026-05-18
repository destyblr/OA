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
    type: "search",
    keyword: "beaute",
    // URL construite dynamiquement: https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=beaute&sft=1
  },

  home: {
    label: "Maison",
    type: "search",
    keyword: "maison",
    // URL construite dynamiquement: https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=maison&sft=1
  }
};
