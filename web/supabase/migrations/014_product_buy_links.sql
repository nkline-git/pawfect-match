-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Product buy-links, click tracking, featured stores
--  Run this in your Supabase SQL editor after 013_store_location_optional.sql
--
--  There's no in-app checkout (no payment processor is connected), so
--  this is the affiliate/referral model: each product can link out to
--  wherever the seller actually sells it (Etsy, PayPal.me, Instagram,
--  their own site). We track clicks so sellers and the admin can see
--  real interest, and "featured" is a manually-toggled admin flag for
--  sellers who've arranged a paid placement off-platform.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE store_products ADD COLUMN IF NOT EXISTS buy_url TEXT;
ALTER TABLE store_products ADD COLUMN IF NOT EXISTS clicks  INTEGER NOT NULL DEFAULT 0;

ALTER TABLE pet_stores ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;

-- SECURITY DEFINER so any visitor (anon or logged in) can bump the click
-- count without needing UPDATE rights on store_products
CREATE OR REPLACE FUNCTION increment_product_click(product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE store_products SET clicks = clicks + 1 WHERE id = product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_product_click(UUID) TO anon, authenticated;

-- Admins need to toggle "featured" regardless of what owner-scoped UPDATE
-- policy already exists on pet_stores (multiple permissive policies OR
-- together, so this is additive/safe)
DROP POLICY IF EXISTS "Admins can update stores" ON pet_stores;
CREATE POLICY "Admins can update stores"
  ON pet_stores FOR UPDATE USING (is_admin());
