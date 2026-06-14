-- ─────────────────────────────────────────────────────────────
-- Migration: enable_rls
-- Fixes Supabase security alerts:
--   1. "Table publicly accessible" (RLS disabled)
--   2. "Sensitive data publicly accessible"
--
-- Architecture:
--   - Public frontend: anon key, read-only
--   - Admin writes: service role key (api/admin-auth.js) — bypasses RLS
--   - Supabase Auth users with role IN ('admin','owner'): allowed to write
--     via authenticated Supabase sessions (native auth flow)
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Helper: is_admin()
-- Returns true if the calling JWT belongs to an authenticated
-- Supabase Auth user whose public.users row has role admin/owner.
-- Used in all write policies.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()::text
      AND u.role IN ('admin', 'owner')
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: articles
-- Public: SELECT non-archived rows (no sensitive cols)
-- Admin:  INSERT / UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_public_read"  ON public.articles;
DROP POLICY IF EXISTS "articles_admin_insert" ON public.articles;
DROP POLICY IF EXISTS "articles_admin_update" ON public.articles;
DROP POLICY IF EXISTS "articles_admin_delete" ON public.articles;

CREATE POLICY "articles_public_read"
  ON public.articles FOR SELECT
  USING (is_archived = false);

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
-- TABLE: comments
-- Public: SELECT (read comments)
-- Public: INSERT (anyone can post a comment — matches insertComment usage)
-- Public: UPDATE (reaction updates — addReaction uses anon key)
-- Admin:  DELETE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_public_read"   ON public.comments;
DROP POLICY IF EXISTS "comments_public_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_public_update" ON public.comments;
DROP POLICY IF EXISTS "comments_admin_delete"  ON public.comments;

CREATE POLICY "comments_public_read"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "comments_public_insert"
  ON public.comments FOR INSERT
  WITH CHECK (true);

-- Reactions-only update: only allow updating the reactions column.
-- Row-level policies cannot restrict to specific columns; column-level
-- security would require SECURITY LABEL. Accept this trade-off — the
-- addReaction() client already only sends { reactions } in the payload.
CREATE POLICY "comments_public_update"
  ON public.comments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "comments_admin_delete"
  ON public.comments FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TABLE: breaking_news
-- Public: SELECT active rows
-- Admin:  INSERT / UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.breaking_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "breaking_news_public_read"  ON public.breaking_news;
DROP POLICY IF EXISTS "breaking_news_admin_insert" ON public.breaking_news;
DROP POLICY IF EXISTS "breaking_news_admin_update" ON public.breaking_news;
DROP POLICY IF EXISTS "breaking_news_admin_delete" ON public.breaking_news;

CREATE POLICY "breaking_news_public_read"
  ON public.breaking_news FOR SELECT
  USING (active = true);

CREATE POLICY "breaking_news_admin_insert"
  ON public.breaking_news FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "breaking_news_admin_update"
  ON public.breaking_news FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "breaking_news_admin_delete"
  ON public.breaking_news FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TABLE: users
-- SENSITIVE: password, password_hash, role must never be publicly readable.
-- Public: No access.
-- Authenticated self: SELECT own non-sensitive row (for profile display).
-- Admin: Full access (SELECT / INSERT / UPDATE / DELETE) — needed by
--        api/admin-auth.js which uses the service role key (bypasses RLS),
--        and by authenticated admin sessions.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_self_read"    ON public.users;
DROP POLICY IF EXISTS "users_admin_all"    ON public.users;

-- Authenticated users can read their own row (non-sensitive columns only).
-- Sensitive columns (password, password_hash, role) are handled at the
-- application layer; use column-level privileges if stricter control needed.
CREATE POLICY "users_self_read"
  ON public.users FOR SELECT
  USING (auth.uid()::text = id);

-- Admins and owners can do anything.
CREATE POLICY "users_admin_all"
  ON public.users FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TABLE: navigation_groups
-- Public: SELECT active rows (used by categoryService.ts)
-- Admin:  INSERT / UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.navigation_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nav_groups_public_read"  ON public.navigation_groups;
DROP POLICY IF EXISTS "nav_groups_admin_insert" ON public.navigation_groups;
DROP POLICY IF EXISTS "nav_groups_admin_update" ON public.navigation_groups;
DROP POLICY IF EXISTS "nav_groups_admin_delete" ON public.navigation_groups;

CREATE POLICY "nav_groups_public_read"
  ON public.navigation_groups FOR SELECT
  USING (active = true);

CREATE POLICY "nav_groups_admin_insert"
  ON public.navigation_groups FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "nav_groups_admin_update"
  ON public.navigation_groups FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "nav_groups_admin_delete"
  ON public.navigation_groups FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TABLE: categories
-- Public: SELECT active rows (used by categoryService.ts)
-- Admin:  INSERT / UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read"  ON public.categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;

CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT
  USING (active = true);

CREATE POLICY "categories_admin_insert"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "categories_admin_update"
  ON public.categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "categories_admin_delete"
  ON public.categories FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TABLE: ad_placements
-- Public: SELECT active ads (needed for frontend ad display)
-- Admin:  INSERT / UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_placements_public_read"  ON public.ad_placements;
DROP POLICY IF EXISTS "ad_placements_admin_insert" ON public.ad_placements;
DROP POLICY IF EXISTS "ad_placements_admin_update" ON public.ad_placements;
DROP POLICY IF EXISTS "ad_placements_admin_delete" ON public.ad_placements;

CREATE POLICY "ad_placements_public_read"
  ON public.ad_placements FOR SELECT
  USING (active = true);

CREATE POLICY "ad_placements_admin_insert"
  ON public.ad_placements FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "ad_placements_admin_update"
  ON public.ad_placements FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "ad_placements_admin_delete"
  ON public.ad_placements FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TABLE: ad_inquiries
-- Public: INSERT (contact/ad inquiry form — anon submission)
-- Admin:  SELECT / DELETE (view and manage inquiries)
-- Only applied if the table exists (optional feature table).
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ad_inquiries'
  ) THEN
    ALTER TABLE public.ad_inquiries ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "ad_inquiries_public_insert" ON public.ad_inquiries;
    DROP POLICY IF EXISTS "ad_inquiries_admin_read"    ON public.ad_inquiries;
    DROP POLICY IF EXISTS "ad_inquiries_admin_delete"  ON public.ad_inquiries;

    CREATE POLICY "ad_inquiries_public_insert"
      ON public.ad_inquiries FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "ad_inquiries_admin_read"
      ON public.ad_inquiries FOR SELECT
      USING (public.is_admin());

    CREATE POLICY "ad_inquiries_admin_delete"
      ON public.ad_inquiries FOR DELETE
      USING (public.is_admin());
  END IF;
END
$$;
