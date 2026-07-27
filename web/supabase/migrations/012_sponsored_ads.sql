-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Sponsored ads (house ads, admin-curated)
--  Run this in your Supabase SQL editor after 011_ein_optional_publish.sql
--
--  Every ad is added and approved by an admin (see /admin "Ads" tab) —
--  there is no self-serve or third-party ad-network integration, so
--  every placement is guaranteed pet-related by construction.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sponsored_ads (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  body        TEXT,
  emoji       TEXT        NOT NULL DEFAULT '🐾',
  image_url   TEXT,
  cta_label   TEXT        NOT NULL DEFAULT 'Learn more',
  cta_url     TEXT        NOT NULL,
  placement   TEXT        NOT NULL DEFAULT 'shop'
                CHECK (placement IN ('shop','community','saved')),
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  priority    INTEGER     NOT NULL DEFAULT 0,   -- higher = shown more often when several are active
  impressions INTEGER     NOT NULL DEFAULT 0,
  clicks      INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER sponsored_ads_updated_at
  BEFORE UPDATE ON sponsored_ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE sponsored_ads ENABLE ROW LEVEL SECURITY;

-- Adopters only ever see active ads; admins manage everything from /admin
CREATE POLICY "Active ads are publicly readable"
  ON sponsored_ads FOR SELECT USING (active = true);

CREATE POLICY "Admins can view all ads"
  ON sponsored_ads FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert ads"
  ON sponsored_ads FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update ads"
  ON sponsored_ads FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete ads"
  ON sponsored_ads FOR DELETE USING (is_admin());

CREATE INDEX IF NOT EXISTS sponsored_ads_placement_idx ON sponsored_ads (placement, active);

-- ── Impression/click counters ─────────────────────────────────────
-- SECURITY DEFINER so any visitor (anon or logged in) can bump these
-- counts without needing UPDATE rights on the table itself
CREATE OR REPLACE FUNCTION increment_ad_impression(ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sponsored_ads SET impressions = impressions + 1 WHERE id = ad_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_ad_click(ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sponsored_ads SET clicks = clicks + 1 WHERE id = ad_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_ad_impression(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ad_click(UUID)      TO anon, authenticated;
