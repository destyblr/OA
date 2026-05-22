-- ================================================================
-- Ajouter colonne first_seen pour tracker la première découverte
-- Exécuter dans Supabase SQL Editor
-- ================================================================

-- Ajouter first_seen si elle n'existe pas déjà
ALTER TABLE asin_details
ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ajouter first_seen pour brand_opportunities aussi
ALTER TABLE brand_opportunities
ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Pour les lignes existantes, utiliser created_at ou last_checked comme first_seen
UPDATE asin_details
SET first_seen = COALESCE(created_at, last_checked, NOW())
WHERE first_seen IS NULL;

UPDATE brand_opportunities
SET first_seen = COALESCE(created_at, last_updated, NOW())
WHERE first_seen IS NULL;

-- Vérification
SELECT
  'asin_details' as table_name,
  COUNT(*) as total_rows,
  COUNT(first_seen) as rows_with_first_seen,
  MIN(first_seen) as oldest,
  MAX(first_seen) as newest
FROM asin_details
UNION ALL
SELECT
  'brand_opportunities',
  COUNT(*),
  COUNT(first_seen),
  MIN(first_seen),
  MAX(first_seen)
FROM brand_opportunities;
