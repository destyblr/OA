-- ================================================================
-- FIX: Nettoyer les valeurs -1 dans asin_details
-- Exécuter dans Supabase SQL Editor
-- ================================================================

-- Fix review_count: -1 → 0
UPDATE asin_details
SET review_count = 0
WHERE review_count IS NOT NULL AND review_count < 0;

-- Fix seller_count: -1 → 0
UPDATE asin_details
SET seller_count = 0
WHERE seller_count IS NOT NULL AND seller_count < 0;

-- Fix rating: -0.1 ou négatif → NULL
UPDATE asin_details
SET rating = NULL
WHERE rating IS NOT NULL AND rating <= 0;

-- Message de confirmation
SELECT
  (SELECT COUNT(*) FROM asin_details WHERE review_count = 0) as reviews_cleaned,
  (SELECT COUNT(*) FROM asin_details WHERE seller_count = 0) as sellers_cleaned,
  (SELECT COUNT(*) FROM asin_details WHERE rating IS NULL) as rating_cleaned;
