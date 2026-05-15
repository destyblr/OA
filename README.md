# OA - Open Arbitrage

Dashboard d'automatisation pour Amazon FBA Ungating

## 🚀 Fonctionnalités

### Actif
- **Ungating Scanner** : Identifie automatiquement les produits Metro/FNAC Pro pour débloquer des catégories Amazon restreintes

### À venir
- Accueil : Vue d'ensemble des statistiques
- Historique : Tous les scans passés
- Opportunités : Meilleures opportunités en temps réel
- Paramètres : Configuration
- Alertes : Notifications

## 📁 Structure du projet

```
OA/
├── index.html                     # Page d'accueil
├── frontend/
│   ├── pages/
│   │   └── ungating.html         # Dashboard Ungating
│   └── components/               # Composants réutilisables (à venir)
├── backend/
│   ├── server.js                 # Serveur Express + WebSocket
│   ├── config/
│   │   └── supabase.js           # Configuration Supabase
│   ├── routes/
│   │   └── ungating.js           # Routes API ungating
│   └── services/
│       ├── ungatingService.js    # Logique métier
│       └── scraper.js            # Scraping (Puppeteer)
├── public/                       # Assets statiques
├── .env                          # Variables d'environnement (à créer)
├── .env.example                  # Template .env
├── package.json
└── README.md
```

## 🛠️ Installation

### 1. Cloner le projet
```bash
cd C:\Users\desty\Desktop\Travail\OA
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
Créez un fichier `.env` à partir de `.env.example` :
```bash
cp .env.example .env
```

Remplissez les variables :
- `SUPABASE_URL` et `SUPABASE_KEY` (après création projet Supabase)
- `SP_API_*` (optionnel, si vous utilisez l'API Amazon)

### 4. Créer la base de données Supabase

Allez sur [supabase.com](https://supabase.com) et créez un nouveau projet.

Exécutez les requêtes SQL suivantes dans l'éditeur SQL :

```sql
-- Table products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  price DECIMAL(10,2) NOT NULL,
  ean VARCHAR(13) UNIQUE NOT NULL,
  asin VARCHAR(10),
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table restrictions
CREATE TABLE restrictions (
  id SERIAL PRIMARY KEY,
  asin VARCHAR(10) UNIQUE NOT NULL,
  is_restricted BOOLEAN NOT NULL,
  units_required INTEGER,
  approval_text TEXT,
  type VARCHAR(20),
  category VARCHAR(100),
  checked_at TIMESTAMP DEFAULT NOW()
);

-- Table scans
CREATE TABLE scans (
  id SERIAL PRIMARY KEY,
  scan_date TIMESTAMP DEFAULT NOW(),
  max_price DECIMAL(10,2),
  categories TEXT[],
  results_count INTEGER,
  total_cost DECIMAL(10,2),
  status VARCHAR(20)
);

-- Table opportunities
CREATE TABLE opportunities (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER REFERENCES scans(id),
  product_id INTEGER REFERENCES products(id),
  restriction_id INTEGER REFERENCES restrictions(id),
  score DECIMAL(5,3),
  cost_ht DECIMAL(10,2),
  cost_ttc DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Démarrer le serveur
```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### 6. Ouvrir le dashboard
Ouvrez `index.html` dans votre navigateur ou utilisez Live Server dans VS Code.

## 🔄 Workflow

### Phase A : Démonstration manuelle (EN COURS)
1. L'utilisateur montre le processus manuel complet
2. Noter les URLs, sélecteurs CSS, logique de navigation
3. Documenter les cas d'erreur

### Phase B : Implémentation (APRÈS DÉMO)
1. Remplir `backend/services/scraper.js` avec vrais sélecteurs
2. Tester sur petits échantillons
3. Optimiser et gérer les erreurs
4. Déployer en production

## 📊 Les 7 Étapes du Scan

1. **Metro** (0-18%) : Scrape Metro avec filtres prix/catégories
2. **EAN Match** (18-38%) : Cross-reference avec Amazon via EAN
3. **Amazon** (38-58%) : Check restrictions Seller Central
4. **SP-API** (58-78%) : Récupère unités requises + type
5. **Score** (78-92%) : Calcule score de priorité
6. **Supabase** (92-100%) : Sauvegarde en base
7. **Affichage** : Tri et affichage des résultats

## 🌐 Déploiement

### Frontend (Netlify)
Le frontend est déjà déployé sur : **https://oa-fba.netlify.app**

Pour mettre à jour :
```bash
git add .
git commit -m "Update"
git push
```
Netlify redéploie automatiquement.

### Backend (à venir)
Options :
- Heroku
- Railway
- Render
- VPS

## 📝 API Endpoints

### `POST /api/ungating/scan/start`
Démarre un nouveau scan
```json
{
  "maxPrice": 12,
  "cats": ["beauty", "grocery", "health"]
}
```

### `GET /api/ungating/scan/:scanId/progress`
Récupère la progression en temps réel

### `GET /api/ungating/scan/:scanId/results`
Récupère les résultats finaux

## 🔐 Sécurité

- ⚠️ Ne JAMAIS commit le fichier `.env`
- `.env` est dans `.gitignore`
- Chiffrer les données sensibles en base
- Valider toutes les entrées utilisateur

## 🐛 Debug

Pour voir les logs en temps réel :
```bash
npm run dev
```

Pour tester un endpoint :
```bash
curl -X POST http://localhost:3000/api/ungating/scan/start \
  -H "Content-Type: application/json" \
  -d '{"maxPrice": 12, "cats": ["beauty"]}'
```

## 📦 Technologies

- **Frontend** : React (inline), Tailwind CSS
- **Backend** : Node.js, Express
- **Scraping** : Puppeteer
- **Database** : Supabase (PostgreSQL)
- **WebSocket** : Socket.io
- **Hosting** : Netlify (frontend), TBD (backend)

## 📄 License

MIT

---

**Version** : 1.0.0  
**Status** : 🚧 En développement  
**Dernière mise à jour** : 14 mai 2026
