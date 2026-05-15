# Documentation de la Démonstration Manuelle

## Date: 2026-05-15

Cette documentation contient tous les sélecteurs, URLs et patterns capturés lors de la démonstration manuelle du processus d'ungating FBA.

---

## ÉTAPE 1: Scraping FNAC Pro

### Catégories et URLs

**3 catégories principales:**

1. **Jouets** (Type: Recherche)
   - Mot-clé: `jouet`
   - URL pattern: `https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&sft=1`

2. **Beauté** (Type: URL directe)
   - URL: `https://www.fnacpro.com/Tous-les-bons-plans-Beaute-Sante-Forme/Bons-plans-Beaute-Sante-Forme/nsh530301/w-4`
   - Page "Bons plans Beauté Santé Forme"

3. **Maison** (Type: URL avec sous-catégorie)
   - URL: `https://www.fnacpro.com/SearchResult/ResultList.aspx?SCat=23!1&SDM=list&Search=maison&sft=1`
   - Paramètre `SCat=23!1`

### Filtres Prix

**Application des filtres selon prix maximum:**
- `<10€`: Filtre `SFilt=1!11`
- `De 10 à 20€`: Filtre `SFilt=2!11`
- **Combinaison**: `SFilt=1!11,2!11` pour prix ≤ 20€

**Exemple URLs avec filtres:**
```
Prix max 12€:
https://www.fnacpro.com/SearchResult/ResultList.aspx?SDM=list&Search=jouet&SFilt=1!11,2!11&sft=1
```

### Pagination

**Scroll infini**: Les produits se chargent en scrollant vers le bas
- Scroll automatique jusqu'à ce qu'il n'y ait plus de nouveaux produits
- Détection: Comparer `document.body.scrollHeight` avant/après scroll

### Données à extraire

1. **Marque** (Brand)
   - Sélecteur: `[class*="brand"], [class*="marque"], .manufacturer`
   - Exemple: "Logitech"

2. **Titre** (Title)
   - Sélecteur: `h2, h3, [class*="title"], [class*="name"]`
   - Exemple: "Souris ergonomique verticale sans fil Bluetooth Logitech Lift"

3. **Prix TTC** (Price)
   - Sélecteur: `[class*="price"], .prix, [class*="amount"]`
   - Format: décimal avec 2 décimales
   - Exemple: 19.90

4. **EAN** (Code-barres)
   - Localisation: Section "Caractéristiques techniques" ou détails
   - Format: 13 chiffres
   - Regex: `/EAN[\s:]*(\d{13})/`
   - Exemple capturé: `5099206099784`

5. **URL du produit**
   - Sélecteur: `a[href*="/a"], a[href*="/product"]`
   - URL complète de la page produit

### Gestion CAPTCHA

**CAPTCHA possible**: "On s'assure qu'on s'adresse bien à vous, et non pas à un robot"

**Solution implémentée: Pause manuelle**
- Puppeteer détecte le CAPTCHA
- Pause le script pendant 2 minutes max
- L'utilisateur résout le CAPTCHA manuellement
- Le script reprend automatiquement

**Prévention:**
- `headless: false` (mode visible, plus humain)
- User-agent réaliste
- Délais aléatoires entre actions (1-3 secondes)
- Suppression des signaux de bot (`navigator.webdriver`)

---

## ÉTAPE 2: Matching Amazon via EAN

### URL Pattern
- **Recherche Amazon**: `https://www.amazon.fr/s?k={EAN}`
- Exemple: `https://www.amazon.fr/s?k=5099206099784`

### Extraction ASIN
- **Pattern URL**: `/dp/{ASIN}`
- **Regex**: `/\/dp\/([A-Z0-9]{10})/`
- **Exemple capturé**: 
  - EAN: `5099206099784`
  - ASIN trouvé: `B0CHYJPKQ5`

### Cas d'erreur
- Si aucun résultat trouvé: Pas de produit Amazon correspondant
- Skip ce produit ou logger l'erreur

---

## ÉTAPE 3: Check Restrictions Seller Central

### Workflow complet

#### 3.1 Page de connexion
- **URL**: `https://sellercentral.amazon.fr/ap/signin`
- **Authentification**: 2FA requis (OTP)
- **Note**: L'automatisation nécessite soit:
  - Connexion manuelle initiale (session persistante)
  - SP-API (pas de scraping)

#### 3.2 Page de recherche produit
- **URL**: `https://sellercentral.amazon.fr/product-search/product-ids`
- **Action**: 
  1. Entrer l'ASIN dans le champ input
  2. Cliquer sur bouton "Soumettre"

#### 3.3 Page de vérification restriction
- **URL Pattern**: `https://sellercentral.amazon.fr/hz/approvalrequest/restrictions/approve?asin={ASIN}&itemcondition=new`
- **Exemple**: `https://sellercentral.amazon.fr/hz/approvalrequest/restrictions/approve?asin=B0CHYJPKQ5&itemcondition=new`

---

## ÉTAPE 4: Détection BRAND vs CATEGORY

### Cas 1: Restriction BRAND (Marque spécifique)

**Exemple capturé: Marque T'nB**

**Page HTML:**
```
Demande d'autorisation de vente

Une autorisation est nécessaire pour vendre les produits suivants :
• Marque T'nB en état(s) Neuf, D'occasion, Reconditionné, De collection

[Bouton: Demande d'autorisation]

Toutefois, nous n'acceptons pas les demandes de mise en vente des produits suivants :
• Autre Catégorie Ordinateur en état(s) De collection
• Autre Catégorie Ordinateur en état(s) Reconditionné
```

**Détection:**
- Présence de: "Marque {NOM_MARQUE}"
- Type: `BRAND`
- Valeur: `{NOM_MARQUE}` (ex: "T'nB")

**Sélecteurs:**
- Titre: Chercher texte contenant "Marque"
- Pattern regex: `/Marque\s+([^\s]+)/`
- Exemple extrait: "T'nB"

**Localisation donnée importante (selon utilisateur):**
> "en dessous de marque XX si catégorie complete à debloquer c'est la que ca apparit"

→ Si sous "Marque XX" il y a une catégorie complète mentionnée, c'est une restriction CATEGORY, pas BRAND

### Cas 2: Restriction CATEGORY (Catégorie complète)

**Exemples théoriques (pas capturés dans cette démo):**
- "Baby Products"
- "Grocery & Gourmet Food"
- "Health & Household"
- "Beauty & Personal Care"
- "Pet Supplies"
- "Toys & Games"

**Détection:**
- Absence de "Marque {NOM}"
- Présence d'un nom de catégorie Amazon
- Type: `CATEGORY`
- Valeur: Nom de la catégorie

---

## ÉTAPE 5: Extraction du nombre d'unités

### Page de demande d'autorisation
**URL**: `https://sellercentral.amazon.fr/sq/approvalrequest?applicationId={ID}`
**Exemple**: `https://sellercentral.amazon.fr/sq/approvalrequest?applicationId=6ecf1661-a25d-9444-6aeb-b129f90af632`

**HTML Structure (selon utilisateur):**
```
Demande d'autorisation de vente pour Marque

Vous avez demandé l'autorisation de vendre la marque T'nB.

Soumettre les documents

Au moins 1 facture (s) d'achat pour les produits d'un fabricant ou d'un fournisseur

Le document doit répondre aux critères suivants :
☐ Portant la date du ou postérieure à 16 nov. 2025 (dans les 180 jours)
☐ Inclure votre nom et votre adresse tels qu'ils figurent dans les informations de votre compte vendeur
☐ Inclure le nom et l'adresse du fabricant ou du distributeur
☐ Afficher l'achat combiné d'au moins 10 unités     <-- ICI LE NOMBRE
☐ Masquer les informations sur les prix (facultatif)
```

**Extraction du nombre d'unités:**
- **Pattern regex**: `/au moins\s+(\d+)\s+unités/i`
- **Exemple capturé**: "au moins **10** unités" → `10`
- **Localisation (selon utilisateur):**
  > "Afficher l'achat combiné d'au moins 10 unités > c ici que cela dit le nombre d'unité"

**Sélecteur CSS possible:**
```javascript
// Chercher dans toutes les checkboxes
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
for (const checkbox of checkboxes) {
  const label = checkbox.closest('label') || checkbox.parentElement;
  const text = label.innerText;
  const match = text.match(/au moins\s+(\d+)\s+unités/i);
  if (match) {
    return parseInt(match[1]); // 10
  }
}
```

---

## ÉTAPE 6: Résumé des données à sauvegarder en Supabase

### Table `products`
```javascript
{
  brand: "Logitech",
  title: "Souris ergonomique verticale sans fil Bluetooth Logitech Lift Gris graphite",
  price: 79.99,
  ean: "5099206099784",
  asin: "B0CHYJPKQ5",
  url: "https://www.fnacpro.com/Souris-ergonomique.../a16870368/w-4"
}
```

### Table `restrictions`
```javascript
{
  asin: "B0CHYJPKQ5",
  is_restricted: true,
  units_required: 10,
  approval_text: "T'nB",
  type: "BRAND",
  category: null
}
```

**Exemple CATEGORY (théorique):**
```javascript
{
  asin: "B08XXXXXX",
  is_restricted: true,
  units_required: 10,
  approval_text: "Baby Products",
  type: "CATEGORY",
  category: "Baby Products"
}
```

---

## ÉTAPE 7: Calcul du Score

### Formule
```javascript
const TVA = 0.20;
const costHT = price * units_required;
const costTTC = costHT * (1 + TVA);

// Bonus CATEGORY
const bonus = (type === 'CATEGORY') ? 1.5 : 1.0;

// Score brut
const rawScore = bonus / costTTC;

// Conversion en étoiles (0-5)
const stars = Math.min(5, Math.ceil(rawScore * 1000));
```

### Exemple avec données capturées
```
Prix: 79.99€
Unités: 10
Type: BRAND

CostHT: 79.99 * 10 = 799.90€
CostTTC: 799.90 * 1.20 = 959.88€
Bonus: 1.0 (BRAND)
RawScore: 1.0 / 959.88 = 0.001042
Stars: min(5, ceil(0.001042 * 1000)) = min(5, 2) = 2 ⭐⭐
```

### Priorité CATEGORY
```
Si c'était une restriction CATEGORY:
Bonus: 1.5
RawScore: 1.5 / 959.88 = 0.001563
Stars: min(5, ceil(1.563)) = 2 ⭐⭐

Mais avec prix ≤ 12€ et 10 unités:
CostTTC: 12 * 10 * 1.20 = 144€
RawScore: 1.5 / 144 = 0.01042
Stars: min(5, ceil(10.42)) = 5 ⭐⭐⭐⭐⭐  (HOT!)
```

---

## Résumé des Sélecteurs et Patterns

### FNAC Pro
- **Cookie Accept**: Sélecteur à déterminer (varie souvent)
- **Produit Container**: À déterminer
- **Marque**: Section "Caractéristiques techniques"
- **EAN**: Section "Caractéristiques techniques", label "EAN"
- **Prix**: À déterminer (probablement class avec "price" ou "prix")

### Amazon
- **Recherche EAN**: URL directe `/s?k={EAN}`
- **ASIN extraction**: Regex `/\/dp\/([A-Z0-9]{10})/` sur premier résultat

### Seller Central
- **Login**: Gestion session / 2FA manuel
- **Champ ASIN**: `https://sellercentral.amazon.fr/product-search/product-ids`
  - Input field pour ASIN
  - Bouton submit
- **Page restriction**: `/hz/approvalrequest/restrictions/approve?asin={ASIN}`
  - Détecter "Marque {NOM}" → BRAND
  - Sinon catégorie → CATEGORY
- **Page demande**: `/sq/approvalrequest?applicationId={ID}`
  - Pattern unités: `/au moins\s+(\d+)\s+unités/i`

---

## Cas d'Erreur à Gérer

1. **FNAC Pro CAPTCHA**
   - Actuellement: Intervention manuelle
   - Future: Service CAPTCHA

2. **EAN non trouvé sur Amazon**
   - Skip produit
   - Logger dans une table `failed_matches`

3. **ASIN non restreint**
   - Ne pas sauvegarder dans `restrictions`
   - Ne pas ajouter aux opportunités

4. **Timeout réseau**
   - Retry avec backoff exponentiel
   - Max 3 tentatives

5. **Seller Central déconnexion**
   - Détecter page login
   - Arrêter scan avec erreur
   - Demander reconnexion

---

## Prochaines Étapes d'Implémentation

1. **Créer Supabase tables**
2. **Implémenter scraper FNAC Pro** (backend/services/scraper.js)
   - Fonction `scrapeFnacPro(maxPrice, categories)`
   - Gérer CAPTCHA manuellement dans un premier temps
3. **Implémenter matching Amazon** (backend/services/scraper.js)
   - Fonction `matchAmazonASINs(products)`
4. **Implémenter check restrictions** (backend/services/scraper.js)
   - Fonction `checkRestrictions(products)`
   - Utiliser session persistante Seller Central
5. **Tester sur échantillon** (10 produits)
6. **Optimiser et déployer**
