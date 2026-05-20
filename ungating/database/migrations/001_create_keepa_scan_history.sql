-- Table pour l'historique des scans Keepa
CREATE TABLE IF NOT EXISTS keepa_scan_history (
  id SERIAL PRIMARY KEY,

  -- Timing
  scan_date TIMESTAMP DEFAULT NOW(),
  duration_seconds INT,

  -- Configuration du scan
  category VARCHAR(100),           -- 'Baby', 'Pet', 'Beauty', 'Grocery'
  subcategory VARCHAR(100),        -- 'Feeding', 'Diapering', etc.
  bsr_min INT,                     -- Ex: 0
  bsr_max INT,                     -- Ex: 30000
  price_min DECIMAL(10,2),         -- Ex: 15.00
  price_max DECIMAL(10,2),         -- Ex: 50.00
  max_sellers INT,                 -- Ex: 5
  amazon_present BOOLEAN DEFAULT FALSE,
  page_number INT DEFAULT 1,
  sort_by VARCHAR(50),             -- 'BSR', 'price', 'reviews'

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
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'running', 'success', 'error'
  error_message TEXT,

  -- Next rotation
  next_rotation_category VARCHAR(100),
  next_rotation_date TIMESTAMP,

  -- Index pour recherche rapide
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_scan_date ON keepa_scan_history(scan_date DESC);
CREATE INDEX idx_status ON keepa_scan_history(status);
CREATE INDEX idx_category ON keepa_scan_history(category);
