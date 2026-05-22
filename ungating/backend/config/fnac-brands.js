/**
 * CONFIGURATION DES MARQUES FNAC PRO
 * Organisées par catégorie pour l'ungating Amazon FBA
 *
 * Filtre appliqué: Prix ≤ 10€
 */

const FNAC_BASE_URL = 'https://www.fnacpro.com/SearchResult/ResultList.aspx';
const PRICE_FILTER = '&SFilt=1!11'; // Prix ≤ 10€
const EXTRA_PARAMS = '&sft=1&SDM=list';

const generateUrl = (brandName) => {
  const encoded = encodeURIComponent(brandName);
  return `${FNAC_BASE_URL}?Search=${encoded}${PRICE_FILTER}${EXTRA_PARAMS}`;
};

module.exports = {
  toys: {
    label: "Jouets & Bébé",
    icon: "🧸",
    brands: [
      { name: "LEGO", url: generateUrl("LEGO") },
      { name: "Disney", url: generateUrl("Disney") },
      { name: "Mattel", url: generateUrl("Mattel") },
      { name: "Hasbro", url: generateUrl("Hasbro") },
      { name: "Playmobil", url: generateUrl("Playmobil") },
      { name: "VTech", url: generateUrl("VTech") },
      { name: "Ravensburger", url: generateUrl("Ravensburger") },
      { name: "Funko", url: generateUrl("Funko") },
      { name: "Star Wars", url: generateUrl("Star Wars") },
      { name: "Bandai", url: generateUrl("Bandai") },
      { name: "Lexibook", url: generateUrl("Lexibook") },
      { name: "Asmodee", url: generateUrl("Asmodee") },
      { name: "Smoby", url: generateUrl("Smoby") },
      { name: "Sylvanian Families", url: generateUrl("Sylvanian Families") },
      { name: "Spin Master", url: generateUrl("Spin Master") },
      { name: "Clementoni", url: generateUrl("Clementoni") },
      { name: "Janod", url: generateUrl("Janod") },
      { name: "Brio", url: generateUrl("Brio") },
      { name: "Melissa & Doug", url: generateUrl("Melissa & Doug") },
      { name: "Goliath", url: generateUrl("Goliath") },
      { name: "Hape", url: generateUrl("Hape") },
      { name: "Chicco", url: generateUrl("Chicco") },
      { name: "Babybjorn", url: generateUrl("Babybjorn") },
      { name: "Sophie la Girafe", url: generateUrl("Sophie la Girafe") },
      { name: "Béaba", url: generateUrl("Béaba") },
      { name: "Dodie", url: generateUrl("Dodie") },
      { name: "MAM", url: generateUrl("MAM") },
      { name: "Tommee Tippee", url: generateUrl("Tommee Tippee") },
      { name: "Philips Avent", url: generateUrl("Philips Avent") }
    ]
  },

  hygiene: {
    label: "Hygiène & Santé",
    icon: "🪥",
    brands: [
      { name: "Oral-B", url: generateUrl("Oral-B") },
      { name: "Braun", url: generateUrl("Braun") },
      { name: "Philips", url: generateUrl("Philips") },
      { name: "Waterpik", url: generateUrl("Waterpik") },
      { name: "Colgate", url: generateUrl("Colgate") },
      { name: "Sensodyne", url: generateUrl("Sensodyne") },
      { name: "Elmex", url: generateUrl("Elmex") }
    ]
  },

  beauty: {
    label: "Beauté & Cosmétiques",
    icon: "💄",
    brands: [
      { name: "L'Oréal", url: generateUrl("L'Oréal") },
      { name: "Garnier", url: generateUrl("Garnier") },
      { name: "Maybelline", url: generateUrl("Maybelline") },
      { name: "Nivea", url: generateUrl("Nivea") },
      { name: "Dove", url: generateUrl("Dove") },
      { name: "Schwarzkopf", url: generateUrl("Schwarzkopf") }
    ]
  },

  office: {
    label: "Bureau & Papeterie",
    icon: "📝",
    brands: [
      { name: "BIC", url: generateUrl("BIC") },
      { name: "Stabilo", url: generateUrl("Stabilo") },
      { name: "Pilot", url: generateUrl("Pilot") },
      { name: "Maped", url: generateUrl("Maped") },
      { name: "Faber-Castell", url: generateUrl("Faber-Castell") },
      { name: "Oxford", url: generateUrl("Oxford") },
      { name: "Clairefontaine", url: generateUrl("Clairefontaine") },
      { name: "Leitz", url: generateUrl("Leitz") },
      { name: "Exacompta", url: generateUrl("Exacompta") }
    ]
  },

  tech: {
    label: "Informatique & Accessoires",
    icon: "💻",
    brands: [
      { name: "Logitech", url: generateUrl("Logitech") },
      { name: "Microsoft", url: generateUrl("Microsoft") },
      { name: "HP", url: generateUrl("HP") }
    ]
  },

  health: {
    label: "Santé & Bien-être",
    icon: "🏥",
    brands: [
      { name: "Omron", url: generateUrl("Omron") },
      { name: "Beurer", url: generateUrl("Beurer") },
      { name: "Medisana", url: generateUrl("Medisana") }
    ]
  }
};
