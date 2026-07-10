-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Lost Pet SOS
--  Owners post lost-pet alerts; community members join the search.
--  Run after 008_rehoming.sql
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Lost pet alerts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lost_pets (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  species            TEXT        NOT NULL DEFAULT 'dog'
    CHECK (species IN ('dog','cat','rabbit','bird','reptile','small_animal','farm','other')),
  breed              TEXT,
  color              TEXT,
  photo_url          TEXT,
  description        TEXT,        -- distinguishing marks, temperament, microchip
  last_seen_location TEXT        NOT NULL,
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat                DOUBLE PRECISION,
  lon                DOUBLE PRECISION,
  contact_email      TEXT,
  contact_phone      TEXT,
  reward             TEXT,        -- free-form, e.g. "$200 reward"
  status             TEXT        NOT NULL DEFAULT 'missing'
    CHECK (status IN ('missing','found')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER lost_pets_updated_at
  BEFORE UPDATE ON lost_pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lost pet alerts are publicly readable"
  ON lost_pets FOR SELECT USING (true);

CREATE POLICY "Users can post their own alerts"
  ON lost_pets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their alerts"
  ON lost_pets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their alerts"
  ON lost_pets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update lost pet alerts"
  ON lost_pets FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete lost pet alerts"
  ON lost_pets FOR DELETE USING (is_admin());

CREATE INDEX IF NOT EXISTS lost_pets_status_idx  ON lost_pets (status, created_at DESC);

-- ── 2. Search party — who's helping look ─────────────────────────
CREATE TABLE IF NOT EXISTS lost_pet_searchers (
  lost_pet_id UUID NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (lost_pet_id, user_id)
);

ALTER TABLE lost_pet_searchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Searcher lists are publicly readable"
  ON lost_pet_searchers FOR SELECT USING (true);

CREATE POLICY "Users can join searches"
  ON lost_pet_searchers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave searches"
  ON lost_pet_searchers FOR DELETE USING (auth.uid() = user_id);
