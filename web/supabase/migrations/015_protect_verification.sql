-- ════════════════════════════════════════════════════════════════════
--  015 — Only admins can grant "Verified" / "Featured"
--  Run in the Supabase SQL editor after 014_product_buy_links.sql
-- ════════════════════════════════════════════════════════════════════
--
-- The owner UPDATE/INSERT policies on rescues and pet_stores allow every
-- column, so any rescue or store owner could mark themselves verified (or
-- featured) straight from the browser with the public anon key. These
-- triggers pin those columns for anyone who isn't an admin or the
-- service role; everything else owners edit is unaffected.

CREATE OR REPLACE FUNCTION protect_rescue_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' OR is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified    := FALSE;
    NEW.verified_at := NULL;
  ELSE
    NEW.verified    := OLD.verified;
    NEW.verified_at := OLD.verified_at;
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
