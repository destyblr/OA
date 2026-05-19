-- Table pour stocker manuellement les unités requises par marque

CREATE TABLE IF NOT EXISTS brand_requirements (
  id SERIAL PRIMARY KEY,
  brand_name VARCHAR(255) UNIQUE NOT NULL,
  units_required INTEGER NOT NULL,
  notes TEXT,
  verified BOOLEAN DEFAULT false,
  last_checked TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide par marque
CREATE INDEX IF NOT EXISTS idx_brand_name ON brand_requirements(brand_name);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_brand_requirements_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS trigger_update_brand_requirements_timestamp ON brand_requirements;
CREATE TRIGGER trigger_update_brand_requirements_timestamp
BEFORE UPDATE ON brand_requirements
FOR EACH ROW
EXECUTE FUNCTION update_brand_requirements_timestamp();

-- Exemples de données initiales (à adapter selon tes besoins)
-- INSERT INTO brand_requirements (brand_name, units_required, notes, verified) VALUES
-- ('PHILIPS', 10, 'Vérifié le 19/05/2026', true),
-- ('LEDUC.S EDITIONS', 1, 'Marque édition', true);
