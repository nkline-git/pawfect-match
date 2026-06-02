-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Community Posts
--  Run this in your Supabase SQL editor after 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════════

-- ── Community posts ─────────────────────────────────────────────
CREATE TABLE community_posts (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  topic      TEXT        NOT NULL DEFAULT 'general'
               CHECK (topic IN ('general','advice','health','training','stories','lost_found')),
  likes      INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Post likes (prevents double-liking) ─────────────────────────
CREATE TABLE post_likes (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id    UUID        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- ── Auto-update updated_at ───────────────────────────────────────
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────────────────────────
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes      ENABLE ROW LEVEL SECURITY;

-- Posts: anyone can read, authenticated users can create/edit their own
CREATE POLICY "Posts are publicly readable"
  ON community_posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON community_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Likes: authenticated users manage their own
CREATE POLICY "Users manage their own likes"
  ON post_likes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Likes are publicly readable"
  ON post_likes FOR SELECT USING (true);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX community_posts_user_id_idx  ON community_posts (user_id);
CREATE INDEX community_posts_topic_idx    ON community_posts (topic);
CREATE INDEX community_posts_created_idx  ON community_posts (created_at DESC);
CREATE INDEX post_likes_post_id_idx       ON post_likes (post_id);
