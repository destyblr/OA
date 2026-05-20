-- Table pour les marques découvertes
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
  min_bsr INT,                     -- Meilleur BSR de la marque
  max_bsr INT,                     -- Pire BSR de la marque
  avg_price_amazon DECIMAL(10,2),
  category VARCHAR(100),
  example_asin VARCHAR(10),        -- ASIN d'exemple pour la marque

  -- Restriction
  is_restricted BOOLEAN DEFAULT FALSE,
  restriction_type VARCHAR(50),    -- 'BRAND', 'CATEGORY', NULL
  restriction_reason TEXT,

  -- FNAC
  nb_products_fnac INT DEFAULT 0,
  avg_price_fnac DECIMAL(10,2),
  fnac_availability_checked_at TIMESTAMP,

  -- Rentabilité
  avg_margin DECIMAL(10,2),        -- Marge moyenne par produit (Amazon - FNAC - Fees)
  estimated_monthly_sales INT DEFAULT 0,  -- Estimé basé sur BSR
  estimated_monthly_profit DECIMAL(10,2),
  unlocking_cost DECIMAL(10,2),
  roi_percentage DECIMAL(5,2),
  payback_days INT,                -- Jours pour récupérer investissement déblocage

  -- Score de priorité (0-100)
  priority_score INT DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'new'  -- 'new', 'evaluated', 'unlocking', 'active', 'rejected'
);

-- Index pour optimisation
CREATE INDEX idx_brand_name ON brand_opportunities(brand);
CREATE INDEX idx_priority_score ON brand_opportunities(priority_score DESC);
CREATE INDEX idx_status ON brand_opportunities(status);
CREATE INDEX idx_discovered_at ON brand_opportunities(discovered_at DESC);
CREATE INDEX idx_category ON brand_opportunities(category);
