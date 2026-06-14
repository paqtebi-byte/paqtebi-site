-- ─────────────────────────────────────────────────────────────
-- Migration: fix_role_based_rls
-- Aligns RLS policies with the two-tier access hierarchy:
--
--   owner  — full privileges; must supply ADMIN_SECRET_CODE at login.
--   admin  — can create/edit/delete articles; cannot manage users.
--
-- Changes vs enable_rls migration:
--   1. articles INSERT/UPDATE/DELETE: open to both 'admin' AND 'owner'.
--      (enable_rls already called is_admin() which covers both — no change
--       needed there, but we document it explicitly for clarity.)
--   2. users table: write policies restricted to 'owner' only so that
--      standard admins can never escalate their own role or touch other users.
--   3. breaking_news / categories / navigation_groups / ad_placements:
--      unchanged — is_admin() already covers both roles correctly.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Helper: is_owner()
-- Returns true only when the calling JWT belongs to an 'owner'.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()::text
      AND u.role = 'owner'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: articles
-- Both 'admin' and 'owner' may INSERT / UPDATE / DELETE.
-- is_admin() already returns true for both roles; re-create
-- policies explicitly to make intent clear and future-proof.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "articles_admin_insert" ON public.articles;
DROP POLICY IF EXISTS "articles_admin_update" ON public.articles;
DROP POLICY IF EXISTS "articles_admin_delete" ON public.articles;

CREATE POLICY "articles_admin_insert"
  ON public.articles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "articles_admin_update"
  ON public.articles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "articles_admin_delete"
  ON public.articles FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TABLE: users
-- SENSITIVE: only 'owner' role may INSERT / UPDATE / DELETE.
-- Standard admins have no write access to the users table.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_admin_all" ON public.users;

-- Owner-only full access (replaces the old admin_all policy).
CREATE POLICY "users_owner_all"
  ON public.users FOR ALL
  USING (public.is_owner())
  WITH CHECK (public.is_owner());
