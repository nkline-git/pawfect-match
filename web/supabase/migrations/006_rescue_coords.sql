-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Rescue Coordinates
--  Adds lat/lon to rescues so local pets can be distance-filtered in
--  the browse queue (previously they showed for every user everywhere).
--  Coordinates are geocoded from the rescue's city at setup/save time.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE rescues
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;

-- Backfill the demo rescue (Wichita, KS)
UPDATE rescues SET lat = 37.6872, lon = -97.3301
  WHERE city ILIKE '%wichita%' AND lat IS NULL;
