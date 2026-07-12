-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Post likes counter trigger
--  Run this in your Supabase SQL editor after 009_lost_pets.sql
--
--  Why: RLS only lets users UPDATE their own community_posts rows, so the
--  client-side "likes" counter write silently no-ops on everyone else's
--  posts. Maintain the counter server-side from post_likes instead.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Counter trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- bypasses community_posts RLS for the counter write
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET likes = likes + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_count_sync ON post_likes;
CREATE TRIGGER post_likes_count_sync
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_likes_count();

-- ── 2. Backfill existing counts ───────────────────────────────────
UPDATE community_posts p
SET likes = (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id);

-- ── 3. Reports: let reporters update their own pending report ─────
-- (the report form upserts; without this, re-reporting the same item 403s)
DROP POLICY IF EXISTS "Reporters can update their own report" ON reports;
CREATE POLICY "Reporters can update their own report"
  ON reports FOR UPDATE
  USING (auth.uid() = reporter_id AND status = 'pending')
  WITH CHECK (auth.uid() = reporter_id);
