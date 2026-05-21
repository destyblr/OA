-- ================================================================
-- CLEAN: Supprimer les anciennes données avec mauvais index Keepa
-- Exécuter dans Supabase SQL Editor
-- ================================================================

-- 1. Supprimer les ASIN avec données invalides (anciennes données Keepa)
--    Critères: review_count < 0 OU seller_count < 0 OU rating < 0
DELETE FROM asin_details
WHERE review_count < 0
   OR seller_count < 0
   OR rating < 0
   OR bsr < 10;  -- BSR = 1 est suspect, probablement un bug

-- 2. Nettoyer les prix négatifs restants
UPDATE asin_details
SET price_amazon = NULL
WHERE price_amazon IS NOT NULL AND price_amazon <= 0;

-- 3. Nettoyer les ratings invalides
UPDATE asin_details
SET rating = NULL
WHERE rating IS NOT NULL AND rating <= 0;

-- Confirmation
SELECT
  'Nettoyage terminé' as message,
  (SELECT COUNT(*) FROM asin_details) as asin_restants,
  (SELECT COUNT(*) FROM brand_opportunities) as marques_restantes;
