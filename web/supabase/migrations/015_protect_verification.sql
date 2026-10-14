-- ════════════════════════════════════════════════════════════════════
--  015 — Only admins can verify/publish rescues or feature stores;
--        draft rescues' pets are private
--  Run in the Supabase SQL editor after 014_product_buy_links.sql
-- ════════════════════════════════════════════════════════════════════
--
-- The owner UPDATE/INSERT policies on rescues and pet_stores allow every
-- column, so any rescue or store owner could mark themselves verified (or
-- featured) straight from the browser with the public anon key. These
-- triggers pin those columns for anyone who isn't an admin or the
-- service role; everything else owners edit is unaffected.
--
-- Rescues start as private drafts and only go live when an admin verifies
-- them (/admin → Verify sets verified + published), so `published` is pinned
-- the same way. Draft rescues' pets are readable only by that rescue (via
-- its existing "manage pets" policy) and admins.

CREATE OR REPLACE FUNCTION protect_rescue_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' OR is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified    := FALSE;
    NEW.verified_at := NULL;
    NEW.published   := FALSE;
  ELSE
    NEW.verified    := OLD.verified;
    NEW.verified_at := OLD.verified_at;
    NEW.published   := OLD.published;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS rescues_protect_verification ON rescues;
CREATE TRIGGER rescues_protect_verification
  BEFORE INSERT OR UPDATE ON rescues
  FOR EACH ROW EXECUTE FUNCTION protect_rescue_verification();

CREATE OR REPLACE FUNCTION protect_store_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' OR is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := FALSE;
    NEW.featured := FALSE;
  ELSE
    NEW.verified := OLD.verified;
    NEW.featured := OLD.featured;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS pet_stores_protect_verification ON pet_stores;
CREATE TRIGGER pet_stores_protect_verification
  BEFORE INSERT OR UPDATE ON pet_stores
  FOR EACH ROW EXECUTE FUNCTION protect_store_verification();

-- ── Draft rescues' pets are private ─────────────────────────────────
-- Public: owner-rehoming pets (no rescue) and pets of published rescues.
-- Rescue owners still read/write their own pets through "Rescue owners can
-- manage pets" (FOR ALL), and rehoming owners through their own policy.
DROP POLICY IF EXISTS "Pets are publicly readable" ON pets;
DROP POLICY IF EXISTS "Published pets are publicly readable" ON pets;
CREATE POLICY "Published pets are publicly readable" ON pets FOR SELECT USING (
  rescue_id IS NULL
  OR EXISTS (SELECT 1 FROM rescues r WHERE r.id = pets.rescue_id AND r.published)
  OR is_admin()
);
