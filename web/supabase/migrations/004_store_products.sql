-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Store Products & Announcements
--  Run this in your Supabase SQL editor after 003_preferences_events_reports.sql
--  Turns each store profile into a mini storefront with its own products.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Store announcement (deal banner on the store's public page) ──
ALTER TABLE pet_stores
  ADD COLUMN IF NOT EXISTS announcement TEXT;

-- ── 2. Store products ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_products (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id    UUID        NOT NULL REFERENCES pet_stores(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  price       INTEGER,               -- cents; NULL = "ask in store"
  compare_at  INTEGER,               -- cents; original price for sale display
  emoji       TEXT        NOT NULL DEFAULT '🛍️',
  photo_url   TEXT,
  category    TEXT        NOT NULL DEFAULT 'other'
    CHECK (category IN ('food','toys','beds','grooming','health','travel','treats','other')),
  in_stock    BOOLEAN     NOT NULL DEFAULT true,
  sort        INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER store_products_updated_at
  BEFORE UPDATE ON store_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store products are publicly readable"
  ON store_products FOR SELECT USING (true);

CREATE POLICY "Store owners can insert products"
  ON store_products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM pet_stores WHERE id = store_id AND user_id = auth.uid())
  );

CREATE POLICY "Store owners can update products"
  ON store_products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM pet_stores WHERE id = store_id AND user_id = auth.uid())
  );

CREATE POLICY "Store owners can delete products"
  ON store_products FOR DELETE USING (
    EXISTS (SELECT 1 FROM pet_stores WHERE id = store_id AND user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS store_products_store_id_idx ON store_products (store_id, sort);
