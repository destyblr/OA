-- ================================================================
-- FIX: Ajouter toutes les colonnes manquantes
-- Exécuter dans Supabase SQL Editor
-- ================================================================

-- Fix asin_details
ALTER TABLE asin_details
ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS restriction_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS hazmat_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS hazmat_reason VARCHAR(255);

-- Fix brand_opportunities
ALTER TABLE brand_opportunities
ADD COLUMN IF NOT EXISTS avg_margin DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS estimated_monthly_sales INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_monthly_profit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS unlocking_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS roi_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS payback_days INT,
ADD COLUMN IF NOT EXISTS fnac_availability_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';

-- Message de confirmation
SELECT 'Colonnes manquantes ajoutées avec succès !' as message;