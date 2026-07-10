-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Owner Rehoming
--  Regular users can post their own pet for adoption ("rehoming").
--  A pet is listed EITHER by a rescue (rescue_id) OR an owner (owner_id).
--  Run after 007_store_events.sql
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Pets can be owner-listed ──────────────────────────────────
ALTER TABLE pets ALTER COLUMN rescue_id DROP NOT NULL;

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS owner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,              -- owner contact for rehoming
  ADD COLUMN IF NOT EXISTS rehome_reason TEXT,              -- why they're rehoming
  ADD COLUMN IF NOT EXISTS city          TEXT,              -- rehoming pets have no rescue city
  ADD COLUMN IF NOT EXISTS lat           DOUBLE PRECISION,  -- geocoded for distance filtering
  ADD COLUMN IF NOT EXISTS lon           DOUBLE PRECISION;

-- Every pet must have a lister
ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_has_lister;
ALTER TABLE pets ADD CONSTRAINT pets_has_lister
  CHECK (rescue_id IS NOT NULL OR owner_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS pets_owner_id_idx ON pets (owner_id);

-- Owners manage their own rehoming listings
DROP POLICY IF EXISTS "Pet owners can manage their rehoming pets" ON pets;
CREATE POLICY "Pet owners can manage their rehoming pets"
  ON pets FOR ALL USING (auth.uid() = owner_id);

-- ── 2. Applications work for rehoming pets too ───────────────────
ALTER TABLE applications ALTER COLUMN rescue_id DROP NOT NULL;

DROP POLICY IF EXISTS "Pet owners can view applications for their pets" ON applications;
CREATE POLICY "Pet owners can view applications for their pets"
  ON applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = applications.pet_id AND pets.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Pet owners can update application status" ON applications;
CREATE POLICY "Pet owners can update application status"
  ON applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = applications.pet_id AND pets.owner_id = auth.uid())
  );

-- ── 3. Storage: any authenticated user may upload pet photos ─────
-- (rehoming owners upload to rehome/<uid>/…, rescues to <rescue_id>/…)
DROP POLICY IF EXISTS "Authenticated users can upload pet photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload pet photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pet-photos');
