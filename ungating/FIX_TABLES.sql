-- ============================================
-- FIX : Ajouter les colonnes manquantes
-- ============================================

-- Ajouter les colonnes manquantes à keepa_scan_history
ALTER TABLE keepa_scan_history
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS amazon_present BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sort_by TEXT DEFAULT 'current_SALES',
ADD COLUMN IF NOT EXISTS asins_after_hazmat INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS brands_restricted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_remaining INTEGER;

-- Mettre à jour les valeurs par défaut pour les anciennes lignes
UPDATE keepa_scan_history
SET amazon_present = NOT exclude_amazon
WHERE amazon_present IS NULL;

SELECT 'Colonnes ajoutées avec succès !' as message;
