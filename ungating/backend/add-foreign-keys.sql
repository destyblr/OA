-- Ajouter les Foreign Keys manquantes dans la table opportunities

-- 1. FK vers products
ALTER TABLE opportunities
ADD CONSTRAINT fk_opportunities_product
FOREIGN KEY (product_id) REFERENCES products(id)
ON DELETE CASCADE;

-- 2. FK vers restrictions
ALTER TABLE opportunities
ADD CONSTRAINT fk_opportunities_restriction
FOREIGN KEY (restriction_id) REFERENCES restrictions(id)
ON DELETE CASCADE;

-- 3. (Optionnel) FK vers scans si la table existe
-- ALTER TABLE opportunities
-- ADD CONSTRAINT fk_opportunities_scan
-- FOREIGN KEY (scan_id) REFERENCES scans(id)
-- ON DELETE SET NULL;
