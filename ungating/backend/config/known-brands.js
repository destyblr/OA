/**
 * MARQUES CONNUES ET LEURS EXIGENCES D'UNGATING
 *
 * Format:
 * {
 *   name: "Nom de la marque",
 *   units: Nombre d'unités requises,
 *   type: "BRAND" ou "CATEGORY",
 *   notes: "Informations supplémentaires"
 * }
 */

module.exports = [
  {
    name: "Disney",
    units: 100,
    type: "BRAND",
    notes: "Marque premium - Jouets, films, produits dérivés"
  },
  {
    name: "Oral-B",
    units: 10,
    type: "BRAND",
    notes: "Hygiène dentaire - Brosses à dents électriques"
  },
  {
    name: "VTech",
    units: 10,
    type: "BRAND",
    notes: "Jouets électroniques pour enfants"
  }
];
