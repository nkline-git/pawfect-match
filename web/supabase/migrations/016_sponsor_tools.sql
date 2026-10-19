-- ════════════════════════════════════════════════════════════════════
--  016 — Sponsor tools: placements, location targeting, daily stats,
--        private sponsor reports, and sponsor inquiries
--  Run in the Supabase SQL editor after 015_protect_verification.sql
-- ════════════════════════════════════════════════════════════════════
--
-- Safe to run before or after deploying the matching app code: the app
-- treats every new column as optional and hides features that need them.

-- ── 1. Who the sponsor is, where it shows, and its report link ─────
ALTER TABLE sponsored_ads ADD COLUMN IF NOT EXISTS sponsor_name     TEXT;
ALTER TABLE sponsored_ads ADD COLUMN IF NOT EXISTS target_city      TEXT;             -- display label, e.g. "San Diego, CA"
ALTER TABLE sponsored_ads ADD COLUMN IF NOT EXISTS target_lat       DOUBLE PRECISION; -- NULL = nationwide
ALTER TABLE sponsored_ads ADD COLUMN IF NOT EXISTS target_lon       DOUBLE PRECISION;
ALTER TABLE sponsored_ads ADD COLUMN IF NOT EXISTS target_radius_mi INTEGER;

-- Report links live in their own admin-only table: active ads are publicly
-- readable, so a token column on sponsored_ads would leak to every visitor.
CREATE TABLE IF NOT EXISTS sponsored_ad_reports (
  ad_id      UUID PRIMARY KEY REFERENCES sponsored_ads(id) ON DELETE CASCADE,
  token      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE sponsored_ad_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage report links" ON sponsored_ad_reports;
CREATE POLICY "Admins manage report links" ON sponsored_ad_reports FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Every ad (existing and future) gets a report link automatically
INSERT INTO sponsored_ad_reports (ad_id) SELECT id FROM sponsored_ads ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION create_ad_report_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO sponsored_ad_reports (ad_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sponsored_ads_report_link ON sponsored_ads;
CREATE TRIGGER sponsored_ads_report_link AFTER INSERT ON sponsored_ads
  FOR EACH ROW EXECUTE FUNCTION create_ad_report_link();

-- New high-attention spots: the "It's a match!" popup and the pet detail sheet
ALTER TABLE sponsored_ads DROP CONSTRAINT IF EXISTS sponsored_ads_placement_check;
ALTER TABLE sponsored_ads ADD CONSTRAINT sponsored_ads_placement_check
  CHECK (placement IN ('shop', 'community', 'saved', 'match', 'detail'));

-- ── 2. Daily stats (the totals on sponsored_ads stay as they are) ──
CREATE TABLE IF NOT EXISTS sponsored_ad_daily (
  ad_id       UUID    NOT NULL REFERENCES sponsored_ads(id) ON DELETE CASCADE,
  day         DATE    NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ad_id, day)
);
ALTER TABLE sponsored_ad_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view ad stats" ON sponsored_ad_daily;
CREATE POLICY "Admins can view ad stats" ON sponsored_ad_daily FOR SELECT USING (is_admin());

-- Counters now also record the day (UTC). Same names/signatures as 012, so
-- the deployed app keeps working unchanged. (The parameter can't be renamed
-- under CREATE OR REPLACE, so it's always qualified and the conflict target
-- is named by constraint — a bare `ad_id` there is ambiguous in PL/pgSQL.)
CREATE OR REPLACE FUNCTION increment_ad_impression(ad_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE sponsored_ads SET impressions = impressions + 1 WHERE id = increment_ad_impression.ad_id AND active;
  IF FOUND THEN
    INSERT INTO sponsored_ad_daily (ad_id, day, impressions) VALUES (increment_ad_impression.ad_id, (now() AT TIME ZONE 'utc')::date, 1)
    ON CONFLICT ON CONSTRAINT sponsored_ad_daily_pkey DO UPDATE SET impressions = sponsored_ad_daily.impressions + 1;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_ad_click(ad_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE sponsored_ads SET clicks = clicks + 1 WHERE id = increment_ad_click.ad_id AND active;
  IF FOUND THEN
    INSERT INTO sponsored_ad_daily (ad_id, day, clicks) VALUES (increment_ad_click.ad_id, (now() AT TIME ZONE 'utc')::date, 1)
    ON CONFLICT ON CONSTRAINT sponsored_ad_daily_pkey DO UPDATE SET clicks = sponsored_ad_daily.clicks + 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_ad_impression(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ad_click(UUID)      TO anon, authenticated;

-- ── 3. Private sponsor report ──────────────────────────────────────
-- Anyone holding an ad's report-link token can read that one ad's stats (the
-- link you send the sponsor). Nothing else is exposed: no other ads, no
-- visitor data.
CREATE OR REPLACE FUNCTION get_sponsor_report(token UUID)
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'title',            a.title,
    'sponsor_name',     a.sponsor_name,
    'placement',        a.placement,
    'target_city',      a.target_city,
    'target_radius_mi', a.target_radius_mi,
    'active',           a.active,
    'starts_at',        a.starts_at,
    'ends_at',          a.ends_at,
    'created_at',       a.created_at,
    'impressions',      a.impressions,
    'clicks',           a.clicks,
    'days', COALESCE((
      SELECT json_agg(json_build_object('day', d.day, 'impressions', d.impressions, 'clicks', d.clicks) ORDER BY d.day)
      FROM sponsored_ad_daily d
      WHERE d.ad_id = a.id AND d.day >= (now() AT TIME ZONE 'utc')::date - 89
    ), '[]'::json)
  )
  FROM sponsored_ads a
  JOIN sponsored_ad_reports r ON r.ad_id = a.id
  WHERE r.token = get_sponsor_report.token;
$$;
GRANT EXECUTE ON FUNCTION get_sponsor_report(UUID) TO anon, authenticated;

-- ── 4. "Become a sponsor" inquiries ────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsor_inquiries (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT        NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 200),
  contact_name  TEXT        NOT NULL CHECK (char_length(contact_name)  BETWEEN 1 AND 200),
  email         TEXT        NOT NULL CHECK (char_length(email) BETWEEN 3 AND 320 AND email LIKE '%@%'),
  phone         TEXT        CHECK (char_length(phone)   <= 50),
  website       TEXT        CHECK (char_length(website) <= 500),
  city          TEXT        CHECK (char_length(city)    <= 200),
  package       TEXT        NOT NULL DEFAULT 'local' CHECK (package IN ('local', 'adoption', 'presenting', 'other')),
  message       TEXT        CHECK (char_length(message) <= 2000),
  status        TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'lost')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE sponsor_inquiries ENABLE ROW LEVEL SECURITY;
-- Anyone may submit; only admins can read or update
DROP POLICY IF EXISTS "Anyone can submit a sponsor inquiry" ON sponsor_inquiries;
CREATE POLICY "Anyone can submit a sponsor inquiry" ON sponsor_inquiries FOR INSERT WITH CHECK (status = 'new');
DROP POLICY IF EXISTS "Admins can view sponsor inquiries" ON sponsor_inquiries;
CREATE POLICY "Admins can view sponsor inquiries" ON sponsor_inquiries FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can update sponsor inquiries" ON sponsor_inquiries;
CREATE POLICY "Admins can update sponsor inquiries" ON sponsor_inquiries FOR UPDATE USING (is_admin());
