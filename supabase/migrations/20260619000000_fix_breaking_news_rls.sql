-- ─────────────────────────────────────────────────────────────
-- Migration: fix_breaking_news_rls
-- Date: 2026-06-19
--
-- Problem:
--   `is_admin()` does: WHERE u.id = auth.uid()::text
--   If the owner logs in via `loginAdminSecure`, the call to
--   supabase.auth.signInWithPassword is intentionally fire-and-forget
--   (failures are silently ignored). If that call fails (e.g. the user
--   only exists in public.users but not in auth.users), auth.uid()
--   will be NULL → is_admin() returns false → RLS blocks all writes
--   on breaking_news, articles, etc.
--
-- Fix (two-part):
--   1. Replace is_admin() and is_owner() with hardened versions that
--      check auth.uid() first, and fall back to auth.email() when
--      auth.uid() is NULL. This covers both the standard admin login
--      (uid-based) and the owner path (email-based fallback).
--   2. DROP + re-CREATE all four breaking_news RLS policies so they
--      use the updated function. Also re-create article write policies
--      for consistency.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Step 1: Harden is_admin()
-- Matches by auth.uid() (primary) OR auth.email() (fallback).
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
    WHERE (
      -- Primary: uid-based match (standard admin login via Supabase Auth)
      (auth.uid() IS NOT NULL AND u.id::text = auth.uid()::text)
      OR
      -- Fallback: email-based match (owner path where signInWithPassword
      -- may silently fail, leaving auth.uid() as NULL)
      (auth.email() IS NOT NULL AND lower(u.email) = lower(auth.email()))
    )
    AND u.role IN ('admin', 'owner')
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Step 2: Harden is_owner() the same way
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
    WHERE (
      (auth.uid() IS NOT NULL AND u.id::text = auth.uid()::text)
      OR
      (auth.email() IS NOT NULL AND lower(u.email) = lower(auth.email()))
    )
    AND u.role = 'owner'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Step 3: Re-create breaking_news RLS policies
-- (DROP+CREATE is idempotent — safe to re-run)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "breaking_news_public_read"  ON public.breaking_news;
DROP POLICY IF EXISTS "breaking_news_admin_insert" ON public.breaking_news;
DROP POLICY IF EXISTS "breaking_news_admin_update" ON public.breaking_news;
DROP POLICY IF EXISTS "breaking_news_admin_delete" ON public.breaking_news;

-- SELECT: anyone can read active ticker items (frontend display)
CREATE POLICY "breaking_news_public_read"
  ON public.breaking_news FOR SELECT
  USING (active = true);

-- INSERT: admin or owner only
CREATE POLICY "breaking_news_admin_insert"
  ON public.breaking_news FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: admin or owner only
CREATE POLICY "breaking_news_admin_update"
  ON public.breaking_news FOR UPDATE
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: admin or owner only
CREATE POLICY "breaking_news_admin_delete"
  ON public.breaking_news FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- Step 4: Re-create article write policies for consistency
-- (No functional change — same is_admin() logic, now hardened)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "articles_admin_insert" ON public.articles;
DROP POLICY IF EXISTS "articles_admin_update" ON public.articles;
DROP POLICY IF EXISTS "articles_admin_delete" ON public.articles;

CREATE POLICY "articles_admin_insert"
  ON public.articles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "articles_admin_update"
  ON public.articles FOR UPDATE
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "articles_admin_delete"
  ON public.articles FOR DELETE
  USING (public.is_admin());
