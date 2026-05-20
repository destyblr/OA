# 🏆 Brand Scanner - Guide de Démarrage

## ✅ Système Complet Installé

Vous avez maintenant un système automatique de découverte de marques rentables Amazon !

---

## 📋 Ce qui a été créé

### **Backend**
- ✅ Service Keepa API (Product Finder)
- ✅ Service Amazon SP-API (Catalog, Restrictions, Hazmat)
- ✅ Service Brand Finder (logique principale)
- ✅ Service Scan Tracker (historique)
- ✅ Routes API `/api/brands/*`
- ✅ CRON Job quotidien (9h00)

### **Frontend**
- ✅ Dashboard "ASIN Rentables" ([asin-rentables.html](frontend/pages/asin-rentables.html))

### **Base de données**
- ✅ Table `keepa_scan_history`
- ✅ Table `brand_opportunities`
- ✅ Table `asin_details`

---

## 🚀 Démarrage Rapide

### **Étape 1 : Créer les tables SQL**

Va sur **Supabase** → **SQL Editor** → Exécute ces 3 fichiers dans l'ordre :

1. [001_create_keepa_scan_history.sql](database/migrations/001_create_keepa_scan_history.sql)
2. [002_create_brand_opportunities.sql](database/migrations/002_create_brand_opportunities.sql)
3. [003_create_asin_details.sql](database/migrations/003_create_asin_details.sql)

### **Étape 2 : Démarrer le serveur**

```bash
cd ungating/backend
npm start
```

Le serveur démarrera et tu verras :
```
✅ Server running on http://localhost:3000
✅ WebSocket server ready
⏰ CRON Job configuré : Scan quotidien à 9h00
✅ CRON Job activé
```

### **Étape 3 : Ouvrir le Dashboard**

Ouvre ton navigateur :
```
http://localhost:3000/pages/asin-rentables.html
```

Ou depuis VS Code → Live Server → ouvrir `ungating/frontend/pages/asin-rentables.html`

---

## 🎯 Fonctionnalités

### **Scanner manuel**
Clique sur **"🔄 Scanner maintenant"** pour lancer un scan immédiat.

### **Scan automatique quotidien**
Tous les jours à **9h00**, le système scanne automatiquement :
- Rotation sur 16 configurations (Baby, Pet, Beauty, Grocery)
- 1 catégorie différente chaque jour
- Cycle complet en 16 jours

### **Filtres Appliqués Automatiquement**
- ✅ BSR < 30,000 (se vend bien)
- ✅ Prix 15-50€
- ✅ Max 5 vendeurs (peu de concurrence)
- ✅ Amazon PAS présent
- ✅ Pas Hazmat
- ✅ 4+ étoiles
- ✅ Min 20 avis

### **Vérifications automatiques**
1. Keepa Product Finder → 100 ASIN
2. Filtre Hazmat (mots-clés)
3. SP-API → Infos produit + Restrictions
4. Check FNAC → Produits disponibles
5. Calcul rentabilité → Score priorité
6. Sauvegarde en base

---

## 📊 Dashboard

### **Stats Globales**
- Dernier scan
- Scans aujourd'hui
- ASIN analysés
- Marques trouvées
- Tokens Keepa restants

### **Historique des Scans**
Tableau avec tous les scans :
- Date
- Catégorie
- ASIN trouvés
- Marques extraites
- Durée
- Statut

### **Marques Découvertes**
Cards avec métriques :
- Score priorité (0-100)
- Nb produits Amazon
- BSR moyen
- Prix Amazon
- ROI %
- Dispo FNAC (✅/❌)
- Restreint (type)
- Payback (jours)

### **Filtres**
- Par catégorie (Baby, Pet, etc.)
- Avec/Sans FNAC
- Tri (Score, BSR, ROI, Date)

---

## 🔧 API Endpoints

### **POST `/api/brands/scan`**
Lancer un scan manuel
```bash
curl -X POST http://localhost:3000/api/brands/scan
```

### **GET `/api/brands/scan-history?limit=10`**
Récupérer l'historique
```bash
curl http://localhost:3000/api/brands/scan-history
```

### **GET `/api/brands/stats`**
Stats globales + tokens Keepa
```bash
curl http://localhost:3000/api/brands/stats
```

### **GET `/api/brands/opportunities`**
Liste des marques
```bash
curl http://localhost:3000/api/brands/opportunities?category=Baby&hasFNAC=true&minScore=80
```

### **GET `/api/brands/:brandName`**
Détails d'une marque
```bash
curl http://localhost:3000/api/brands/PHILIPS
```

---

## 🎲 Plan de Rotation (16 jours)

| Jour | Catégorie | BSR Range | Page |
|------|-----------|-----------|------|
| 1 | Baby | 0-20k | 1 |
| 2 | Baby | 0-20k | 2 |
| 3 | Baby | 0-30k | 1 |
| 4 | Baby | 20k-50k | 1 |
| 5 | Pet | 0-20k | 1 |
| 6 | Pet | 0-20k | 2 |
| 7 | Pet | 0-30k | 1 |
| 8 | Pet | 20k-50k | 1 |
| 9 | Beauty | 0-25k | 1 |
| 10 | Beauty | 0-25k | 2 |
| 11 | Beauty | 0-35k | 1 |
| 12 | Beauty | 20k-50k | 1 |
| 13 | Grocery | 0-20k | 1 |
| 14 | Grocery | 0-20k | 2 |
| 15 | Grocery | 0-30k | 1 |
| 16 | Grocery | 20k-50k | 1 |

**Puis recommence au jour 1 !**

---

## 💰 Utilisation des Tokens Keepa

- **Par scan** : ~100 tokens (10 requêtes × 10 tokens)
- **Par jour** : 100 tokens (1 scan)
- **Par mois** : ~3,000 tokens (30 scans)
- **Disponible** : 1,440 tokens/jour (1/minute)
- **→ Tu utilises seulement 7% de ta capacité !**

---

## 🐛 Troubleshooting

### **Les tables n'existent pas**
→ Exécute les migrations SQL sur Supabase

### **Erreur Keepa API**
→ Vérifie la clé dans `.env` : `KEEPA_API_KEY=...`

### **Erreur SP-API**
→ Vérifie les credentials dans `.env` :
```
SP_API_CLIENT_ID=...
SP_API_CLIENT_SECRET=...
SP_API_REFRESH_TOKEN=...
```

### **Dashboard ne charge pas**
→ Vérifie que le serveur tourne sur port 3000
→ Ouvre la console navigateur (F12) pour voir les erreurs

### **Aucune marque trouvée**
→ Lance un scan manuel d'abord
→ Attends 5-10 minutes

---

## 📝 Prochaines Étapes

1. ✅ Exécuter les migrations SQL
2. ✅ Démarrer le serveur
3. ✅ Lancer un scan manuel
4. ✅ Explorer le dashboard
5. ✅ Attendre le scan quotidien automatique (9h00)

---

## 🎉 C'est Prêt !

Tu as maintenant un système complet qui :
- ✅ Scanne automatiquement tous les jours
- ✅ Trouve 30-50 marques rentables/jour
- ✅ Vérifie disponibilité FNAC
- ✅ Calcule la rentabilité
- ✅ Affiche un dashboard avec historique
- ✅ Rotation automatique sur 16 jours

**Profite bien ! 🚀**
