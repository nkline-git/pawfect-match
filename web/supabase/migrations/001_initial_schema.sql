-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Initial Schema
--  Run this in your Supabase SQL editor or via `supabase db push`
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Adopter profiles (extends Supabase auth.users) ───────────────
CREATE TABLE profiles (
  id                  UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name          TEXT        NOT NULL,
  last_name_initial   TEXT,
  city                TEXT        NOT NULL,
  bio                 TEXT,
  avatar              TEXT        NOT NULL DEFAULT '🙂',
  lifestyle           TEXT[]      NOT NULL DEFAULT '{}',
  time_availability   TEXT,
  notification_prefs  JSONB       NOT NULL DEFAULT '{"matches":true,"events":true,"community":false,"deals":true}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Rescues / Shelters ───────────────────────────────────────────
CREATE TABLE rescues (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  name                 TEXT        NOT NULL,
  city                 TEXT        NOT NULL,
  mission              TEXT,
  logo                 TEXT        NOT NULL DEFAULT '🏠',
  banner_gradient      TEXT        NOT NULL DEFAULT 'linear-gradient(135deg,#1A4A9C,#2D7DD2)',
  phone                TEXT,
  email                TEXT,
  website              TEXT,
  hours                TEXT,
  appointment_required BOOLEAN     NOT NULL DEFAULT FALSE,
  animal_types         TEXT[]      NOT NULL DEFAULT '{}',
  requirements         JSONB       NOT NULL DEFAULT '{"application":true,"homeVisit":false,"refCheck":false,"trial":false}',
  fee_range            TEXT,
  requirement_notes    TEXT,
  ein                  TEXT        NOT NULL UNIQUE,
  verified             BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at          TIMESTAMPTZ,
  stats                JSONB       NOT NULL DEFAULT '{"animals":0,"placed":0,"apps":0}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Pets ─────────────────────────────────────────────────────────
CREATE TABLE pets (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  rescue_id   UUID        NOT NULL REFERENCES rescues(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  species     TEXT        NOT NULL CHECK (species IN ('dog','cat','rabbit','bird','reptile','small_animal','farm','other')),
  breed       TEXT,
  age         TEXT,
  gender      TEXT        CHECK (gender IN ('Male','Female','Unknown')),
  size        TEXT        CHECK (size IN ('Small','Medium','Large','XL')),
  energy      TEXT        CHECK (energy IN ('Low','Medium','High','Very High')),
  traits      TEXT[]      NOT NULL DEFAULT '{}',
  description TEXT,
  fee         INTEGER,    -- in cents (null = free / donation)
  photos      TEXT[]      NOT NULL DEFAULT '{}',
  status      TEXT        NOT NULL DEFAULT 'available' CHECK (status IN ('available','pending','adopted')),
  good_with   TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Saved pets ───────────────────────────────────────────────────
CREATE TABLE saved_pets (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id     UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pet_id)
);

-- ── Adoption applications ────────────────────────────────────────
CREATE TABLE applications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id     UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  rescue_id  UUID        NOT NULL REFERENCES rescues(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected')),
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, pet_id)  -- one application per adopter per pet
);

-- ── Auto-update updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rescues_updated_at     BEFORE UPDATE ON rescues     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pets_updated_at        BEFORE UPDATE ON pets        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────────────────────────
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescues      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_pets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only edit their own
CREATE POLICY "Profiles are publicly readable"   ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Rescues: publicly readable, only owner can edit
CREATE POLICY "Rescues are publicly readable"    ON rescues FOR SELECT USING (true);
CREATE POLICY "Rescue owners can insert"         ON rescues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Rescue owners can update"         ON rescues FOR UPDATE USING (auth.uid() = user_id);

-- Pets: publicly readable, rescue owner can manage
CREATE POLICY "Pets are publicly readable"       ON pets FOR SELECT USING (true);
CREATE POLICY "Rescue owners can manage pets"    ON pets FOR ALL USING (
  EXISTS (SELECT 1 FROM rescues WHERE rescues.id = pets.rescue_id AND rescues.user_id = auth.uid())
);

-- Saved pets: users manage their own
CREATE POLICY "Users manage their own saves"     ON saved_pets FOR ALL USING (auth.uid() = user_id);

-- Applications: applicant and rescue owner can view
CREATE POLICY "Applicants can view their own"    ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Rescue owners can view applications" ON applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM rescues WHERE rescues.id = applications.rescue_id AND rescues.user_id = auth.uid())
);
CREATE POLICY "Applicants can create"            ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Rescue owners can update status"  ON applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM rescues WHERE rescues.id = applications.rescue_id AND rescues.user_id = auth.uid())
);

-- ── Useful indexes ───────────────────────────────────────────────
CREATE INDEX pets_rescue_id_idx      ON pets (rescue_id);
CREATE INDEX pets_status_idx         ON pets (status);
CREATE INDEX pets_species_idx        ON pets (species);
CREATE INDEX applications_rescue_idx ON applications (rescue_id);
CREATE INDEX applications_user_idx   ON applications (user_id);
