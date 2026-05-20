-- ================================================================
-- BRAND SCANNER - ALL MIGRATIONS
-- Exécuter ce fichier sur Supabase SQL Editor
-- ================================================================

-- Table 1 : Historique des scans Keepa
CREATE TABLE IF NOT EXISTS keepa_scan_history (
  id SERIAL PRIMARY KEY,

  -- Timing
  scan_date TIMESTAMP DEFAULT NOW(),
  duration_seconds INT,

  -- Configuration du scan
  category VARCHAR(100),
  subcategory VARCHAR(100),
  bsr_min INT,
  bsr_max INT,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  max_sellers INT,
  amazon_present BOOLEAN DEFAULT FALSE,
  page_number INT DEFAULT 1,
  sort_by VARCHAR(50),

  -- Résultats
  asins_found INT DEFAULT 0,
  asins_after_hazmat INT DEFAULT 0,
  brands_found INT DEFAULT 0,
  brands_restricted INT DEFAULT 0,
  brands_with_fnac INT DEFAULT 0,

  -- Tokens Keepa
  tokens_used INT DEFAULT 0,
  tokens_remaining INT,

  -- Statut
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,

  -- Next rotation
  next_rotation_category VARCHAR(100),
  next_rotation_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_date ON keepa_scan_history(scan_date DESC);
CREATE INDEX IF NOT EXISTS idx_status ON keepa_scan_history(status);
CREATE INDEX IF NOT EXISTS idx_category ON keepa_scan_history(category);

-- Table 2 : Marques découvertes
CREATE TABLE IF NOT EXISTS brand_opportunities (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(255) UNIQUE NOT NULL,

  -- Lien avec le scan
  scan_id INT REFERENCES keepa_scan_history(id) ON DELETE SET NULL,
  discovered_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),

  -- Métriques Amazon
  nb_products_amazon INT DEFAULT 0,
  avg_bsr INT,
  min_bsr INT,
  max_bsr INT,
  avg_price_amazon DECIMAL(10,2),
  category VARCHAR(100),
  example_asin VARCHAR(10),

  -- Restriction
  is_restricted BOOLEAN DEFAULT FALSE,
  restriction_type VARCHAR(50),
  restriction_reason TEXT,

  -- FNAC
  nb_products_fnac INT DEFAULT 0,
  avg_price_fnac DECIMAL(10,2),
  fnac_availability_checked_at TIMESTAMP,

  -- Rentabilité
  avg_margin DECIMAL(10,2),
  estimated_monthly_sales INT DEFAULT 0,
  estimated_monthly_profit DECIMAL(10,2),
  unlocking_cost DECIMAL(10,2),
  roi_percentage DECIMAL(5,2),
  payback_days INT,

  -- Score de priorité (0-100)
  priority_score INT DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'new'
);

CREATE INDEX IF NOT EXISTS idx_brand_name ON brand_opportunities(brand);
CREATE INDEX IF NOT EXISTS idx_priority_score ON brand_opportunities(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_status_brand ON brand_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_discovered_at ON brand_opportunities(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_brand ON brand_opportunities(category);

-- Table 3 : Détails des ASIN scannés
CREATE TABLE IF NOT EXISTS asin_details (
  id SERIAL PRIMARY KEY,
  asin VARCHAR(10) UNIQUE NOT NULL,

  -- Lien avec scan et marque
  scan_id INT REFERENCES keepa_scan_history(id) ON DELETE SET NULL,
  brand VARCHAR(255),
  brand_id INT REFERENCES brand_opportunities(id) ON DELETE SET NULL,

  -- Infos produit
  title TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),

  -- Keepa data
  bsr INT,
  bsr_drops_30d INT DEFAULT 0,
  price_amazon DECIMAL(10,2),
  rating DECIMAL(3,2),
  review_count INT DEFAULT 0,
  seller_count INT DEFAULT 0,
  amazon_present BOOLEAN DEFAULT FALSE,

  -- SP-API data
  is_restricted BOOLEAN DEFAULT FALSE,
  restriction_type VARCHAR(50),
  restriction_checked_at TIMESTAMP,
  is_hazmat BOOLEAN DEFAULT FALSE,
  hazmat_reason VARCHAR(255),
  hazmat_checked_at TIMESTAMP,

  -- Images
  image_url TEXT,

  -- Dates
  first_seen TIMESTAMP DEFAULT NOW(),
  last_checked TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asin ON asin_details(asin);
CREATE INDEX IF NOT EXISTS idx_brand_asin ON asin_details(brand);
CREATE INDEX IF NOT EXISTS idx_bsr_asin ON asin_details(bsr);
CREATE INDEX IF NOT EXISTS idx_first_seen ON asin_details(first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_is_restricted ON asin_details(is_restricted);

-- ================================================================
-- MIGRATIONS TERMINÉES ✅
-- ================================================================
