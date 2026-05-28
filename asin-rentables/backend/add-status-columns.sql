-- Ajouter colonnes status et rejection_reason à profitable_asins

ALTER TABLE profitable_asins
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Mettre à jour les ASIN existants comme 'approved' (ils ont passé les filtres)
UPDATE profitable_asins
SET status = 'approved'
WHERE status IS NULL;

-- Index pour filtrer par status
CREATE INDEX IF NOT EXISTS idx_profitable_asins_status ON profitable_asins(status);

-- Commentaires
COMMENT ON COLUMN profitable_asins.status IS 'approved = OK pour vente, rejected = ne passe pas filtres';
COMMENT ON COLUMN profitable_asins.rejection_reason IS 'amazon_sells, too_many_sellers, both';
