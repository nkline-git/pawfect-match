-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Store location optional (home-based/online sellers)
--  Run this in your Supabase SQL editor after 012_sponsored_ads.sql
--
--  Lets someone selling handmade goods from home (no storefront) register
--  a store without a city. The app shows "Online / ships nationwide"
--  wherever a physical location would normally appear.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE pet_stores ALTER COLUMN city DROP NOT NULL;
