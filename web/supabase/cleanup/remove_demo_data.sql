-- ════════════════════════════════════════════════════════════════════
--  Remove fabricated demo / test data from production
--  REVIEW BEFORE RUNNING. Paste into the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════
--
-- Every row below was identified by a read-only audit (Oct 12 2026) as
-- fabricated or test data that real visitors could see. IDs are explicit so
-- nothing else can be caught by a pattern match. Runs as one transaction:
-- if any statement fails, nothing is deleted.

BEGIN;

-- ── Fake "Heartland Paws Rescue" (555 phone, invented EIN 82-5551234,
--    marked Verified) and the junk "123" test rescue (EIN 12-3456789)
DELETE FROM events  WHERE rescue_id IN ('eff38708-8b72-4374-b4ec-0458177701e5', 'dcb8c062-b2ec-43ba-8130-07b0faa5448c');
DELETE FROM pets    WHERE rescue_id IN ('eff38708-8b72-4374-b4ec-0458177701e5', 'dcb8c062-b2ec-43ba-8130-07b0faa5448c');
              -- Maple, Otis, Willow (stock photos), Biscuit; "123453", "123123123"
DELETE FROM rescues WHERE id        IN ('eff38708-8b72-4374-b4ec-0458177701e5', 'dcb8c062-b2ec-43ba-8130-07b0faa5448c');

-- ── "Peanut" — demo owner-rehoming listing
DELETE FROM pets WHERE id = '222f4544-b566-42d8-bb4d-98d2d98fc7cc';

-- ── "Ziggy" — demo lost-pet alert (555 phone)
DELETE FROM lost_pets WHERE id = 'baf24678-4a11-4c5e-afa4-5c868431e99b';

-- ── Fake "The Dapper Dog Supply Co." (555 phone, marked Verified) and its
--    4 products (store_products cascade)
DELETE FROM events     WHERE store_id = 'e7dd90f3-4e6e-412c-a443-842547bec244';
DELETE FROM pet_stores WHERE id       = 'e7dd90f3-4e6e-412c-a443-842547bec244';

-- ── The three demo login accounts. Their passwords were published in the
--    (public) repo, so delete rather than reset. Cascades to their
--    profiles, saves, posts, likes, reports, and lost-pet rows.
--    Sarah = demo-rescue, Mike = demo-store, Jamie = demo-adopter
DELETE FROM auth.users WHERE id IN (
  '563852f7-729e-4ad5-8d79-95b434837fcd',
  '33cf346c-9781-4dbd-b379-314c97a46566',
  '25f33cbc-92d4-4d09-8bf0-f036f204cdbd'
);

-- ── OPTIONAL: "Pawf3ct match llc" — a store created from YOUR account
--    (nick, 7d39a0b7…) on Aug 2, no products. Uncomment if it was a test.
-- DELETE FROM pet_stores WHERE id = 'dfc9e085-1ee5-4578-8580-8aec78c8a0db';

-- Not touched: the account that created the "123" rescue (Andy,
-- a03f0817…) may be a real person — only their junk rescue is removed.

-- Sanity check — every count should be 0
SELECT
  (SELECT count(*) FROM rescues    WHERE id IN ('eff38708-8b72-4374-b4ec-0458177701e5','dcb8c062-b2ec-43ba-8130-07b0faa5448c')) AS rescues_left,
  (SELECT count(*) FROM pets       WHERE id IN ('47089d3e-f705-4d59-927f-e2cdae26343e','01f7507b-ceb2-41d0-b4ec-b320751042a7','effe07e8-9f6d-4ca7-8b48-bc3ed5deaefd','29067f61-d14f-4f96-8d0c-dcd6e683fe40','222f4544-b566-42d8-bb4d-98d2d98fc7cc','7c9859c2-f429-46b9-96fd-d3011d3350f1','08c00033-4165-47cf-a29d-9089032d5196')) AS pets_left,
  (SELECT count(*) FROM pet_stores WHERE id = 'e7dd90f3-4e6e-412c-a443-842547bec244') AS stores_left,
  (SELECT count(*) FROM lost_pets  WHERE id = 'baf24678-4a11-4c5e-afa4-5c868431e99b') AS lost_pets_left,
  (SELECT count(*) FROM auth.users WHERE id IN ('563852f7-729e-4ad5-8d79-95b434837fcd','33cf346c-9781-4dbd-b379-314c97a46566','25f33cbc-92d4-4d09-8bf0-f036f204cdbd')) AS demo_users_left;

COMMIT;
