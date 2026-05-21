-- ================================================================
-- FIX: Nettoyer les prix négatifs/zéro dans les tables
-- Exécuter dans Supabase SQL Editor
-- ================================================================

-- Fix asin_details: Mettre NULL pour les prix <= 0
UPDATE asin_details
SET price_amazon = NULL
WHERE price_amazon IS NOT NULL AND price_amazon <= 0;

-- Fix brand_opportunities: Mettre NULL pour les prix moyens <= 0
UPDATE brand_opportunities
SET avg_price_amazon = NULL
WHERE avg_price_amazon IS NOT NULL AND avg_price_amazon <= 0;

-- Message de confirmation
SELECT
  (SELECT COUNT(*) FROM asin_details WHERE price_amazon IS NULL) as asin_prix_null,
  (SELECT COUNT(*) FROM brand_opportunities WHERE avg_price_amazon IS NULL) as brand_prix_null;
