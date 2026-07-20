-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — EIN-optional rescue onboarding + publish gate
--  Run this in your Supabase SQL editor after 010_post_likes_trigger.sql
--
--  Rescues can now build their page without an EIN. Their page stays a
--  draft (published = FALSE) until they either add an EIN or an admin
--  approves a manual review request.
-- ═══════════════════════════════════════════════════════════════════

-- EIN no longer required up front (UNIQUE still enforced when present —
-- Postgres unique constraints allow multiple NULLs)
ALTER TABLE rescues ALTER COLUMN ein DROP NOT NULL;

-- Publish gate: existing rescues stay live (default TRUE + backfill);
-- the app explicitly creates EIN-less rescues with published = FALSE
ALTER TABLE rescues ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE;

-- Set when a draft rescue asks for manual approval instead of an EIN
ALTER TABLE rescues ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ;
