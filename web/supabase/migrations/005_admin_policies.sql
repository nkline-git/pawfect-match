-- ═══════════════════════════════════════════════════════════════════
--  Pawfect Match — Admin Policies & Role Security
--  Run this in your Supabase SQL editor after 004_store_products.sql
--
--  Fixes three security issues:
--   1. Any user could set their own role to 'admin' (privilege escalation)
--   2. Admin "Hide content" silently failed (no admin policy on posts/events)
--   3. Admin rescue Verify/Reject silently failed (no admin policy on rescues)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. is_admin() helper ─────────────────────────────────────────
-- SECURITY DEFINER so the profiles lookup bypasses RLS (no recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 2. Block role self-escalation ────────────────────────────────
-- Only existing admins (or the service role key) may change any role.
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Service-role requests (server-side, admin seeding) are always allowed
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;
    -- Otherwise only a full admin may change roles
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON profiles;
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- ── 3. Admin moderation policies ─────────────────────────────────
-- Rescues: verify (update) and reject (delete) from the admin panel
DROP POLICY IF EXISTS "Admins can update rescues" ON rescues;
CREATE POLICY "Admins can update rescues"
  ON rescues FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete rescues" ON rescues;
CREATE POLICY "Admins can delete rescues"
  ON rescues FOR DELETE USING (is_admin());

-- Community posts: soft-hide reported content
DROP POLICY IF EXISTS "Admins can update posts" ON community_posts;
CREATE POLICY "Admins can update posts"
  ON community_posts FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete posts" ON community_posts;
CREATE POLICY "Admins can delete posts"
  ON community_posts FOR DELETE USING (is_admin());

-- Events: soft-hide reported events
DROP POLICY IF EXISTS "Admins can update events" ON events;
CREATE POLICY "Admins can update events"
  ON events FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete events" ON events;
CREATE POLICY "Admins can delete events"
  ON events FOR DELETE USING (is_admin());

-- Pets: remove bad/fraudulent listings
DROP POLICY IF EXISTS "Admins can update pets" ON pets;
CREATE POLICY "Admins can update pets"
  ON pets FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete pets" ON pets;
CREATE POLICY "Admins can delete pets"
  ON pets FOR DELETE USING (is_admin());
