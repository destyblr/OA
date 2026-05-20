-- Table pour les détails des ASIN scannés
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
  bsr_drops_30d INT DEFAULT 0,     -- Nombre de drops de BSR = ventes
  price_amazon DECIMAL(10,2),
  rating DECIMAL(3,2),             -- Ex: 4.50
  review_count INT DEFAULT 0,
  seller_count INT DEFAULT 0,
  amazon_present BOOLEAN DEFAULT FALSE,

  -- SP-API data
  is_restricted BOOLEAN DEFAULT FALSE,
  restriction_type VARCHAR(50),    -- 'BRAND', 'CATEGORY', NULL
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

-- Index pour optimisation
CREATE INDEX idx_asin ON asin_details(asin);
CREATE INDEX idx_brand ON asin_details(brand);
CREATE INDEX idx_bsr ON asin_details(bsr);
CREATE INDEX idx_first_seen ON asin_details(first_seen DESC);
CREATE INDEX idx_is_restricted ON asin_details(is_restricted);
