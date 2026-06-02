-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Preferences, Events & Reports
--  Run this in your Supabase SQL editor after 002_community_posts.sql
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Extend profiles ───────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB,
  ADD COLUMN IF NOT EXISTS role        TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'moderator'));

-- ── 2. Events ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id)  ON DELETE CASCADE,
  rescue_id   UUID        REFERENCES rescues(id)     ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  event_type  TEXT        NOT NULL DEFAULT 'other'
    CHECK (event_type IN ('adoption_event','fundraiser','volunteer_day','training','meetup','other')),
  location    TEXT,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  image_url   TEXT,
  status      TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','cancelled','completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are publicly readable"
  ON events FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event owners can update"
  ON events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Event owners can delete"
  ON events FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS events_starts_at_idx  ON events (starts_at);
CREATE INDEX IF NOT EXISTS events_rescue_id_idx  ON events (rescue_id);
CREATE INDEX IF NOT EXISTS events_user_id_idx    ON events (user_id);

-- ── 3. Reports ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type  TEXT        NOT NULL
    CHECK (content_type IN ('post','event','pet','user','rescue')),
  content_id    UUID        NOT NULL,
  reason        TEXT        NOT NULL
    CHECK (reason IN ('spam','scam','inappropriate','false_info','animal_safety','other')),
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  reviewer_id   UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reporter_id, content_type, content_id)  -- one report per user per item
);

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can file a report
CREATE POLICY "Authenticated users can report"
  ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can see their own reports; admins see all
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','moderator')
    )
  );

CREATE POLICY "Admins can update report status"
  ON reports FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','moderator')
    )
  );

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status);
CREATE INDEX IF NOT EXISTS reports_content_idx ON reports (content_type, content_id);

-- ── 4. Hidden content flags ──────────────────────────────────────
-- Lets admins soft-hide posts/events without deleting them
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;
