-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Store Events
--  Lets pet stores post events (sales, workshops, adoption days) on
--  their storefront page, same as rescues do.
--  Run after 006_rescue_coords.sql
-- ═══════════════════════════════════════════════════════════════════

-- Associate events with a store (rescue_id already exists for rescues)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES pet_stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS events_store_id_idx ON events (store_id);

-- Widen event types with store-flavored ones
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'adoption_event', 'fundraiser', 'volunteer_day', 'training',
    'meetup', 'sale', 'workshop', 'other'
  ));
