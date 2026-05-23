-- Table pour stocker les ASIN rentables détectés via scans marques FNAC
CREATE TABLE IF NOT EXISTS profitable_asins (
  id BIGSERIAL PRIMARY KEY,
  asin VARCHAR(10) UNIQUE NOT NULL,
  brand VARCHAR(255),
  title TEXT,
  bsr INTEGER,
  price_amazon DECIMAL(10,2),
  sellers_count INTEGER,
  rating DECIMAL(3,2),
  reviews_count INTEGER,
  image_url TEXT,
  category VARCHAR(255),
  source VARCHAR(50) DEFAULT 'keepa_brand_scan',
  scanned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_profitable_asins_brand ON profitable_asins(brand);
CREATE INDEX IF NOT EXISTS idx_profitable_asins_bsr ON profitable_asins(bsr);
CREATE INDEX IF NOT EXISTS idx_profitable_asins_category ON profitable_asins(category);
CREATE INDEX IF NOT EXISTS idx_profitable_asins_scanned_at ON profitable_asins(scanned_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_profitable_asins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profitable_asins_updated_at
BEFORE UPDATE ON profitable_asins
FOR EACH ROW
EXECUTE FUNCTION update_profitable_asins_updated_at();

-- Commentaire
COMMENT ON TABLE profitable_asins IS 'ASIN rentables détectés via scans de marques FNAC Pro pour ungating';
