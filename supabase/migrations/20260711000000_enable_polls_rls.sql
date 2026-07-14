-- ─────────────────────────────────────────────────────────────
-- Migration: enable_polls_rls
-- Date: 2026-07-11
--
-- Tables `polls` and `poll_options` have RLS disabled.
-- All other public tables already have RLS enabled.
--
-- Access model (consistent with existing tables):
--   Public:  SELECT active polls + their options (frontend display)
--   Admin:   INSERT / UPDATE / DELETE (admin dashboard via anon client)
--   Service: service_role key bypasses RLS
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- TABLE: polls
-- Public: SELECT active polls
-- Admin:  INSERT / UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls_public_read"  ON public.polls;
DROP POLICY IF EXISTS "polls_admin_insert" ON public.polls;
DROP POLICY IF EXISTS "polls_admin_update" ON public.polls;
DROP POLICY IF EXISTS "polls_admin_delete" ON public.polls;

CREATE POLICY "polls_public_read"
  ON public.polls FOR SELECT
  USING (active = true);

CREATE POLICY "polls_admin_insert"
  ON public.polls FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "polls_admin_update"
  ON public.polls FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "polls_admin_delete"
  ON public.polls FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TABLE: poll_options
-- Public: SELECT options belonging to active polls
-- Public: UPDATE (to increment vote counts from the frontend)
-- Admin:  INSERT / DELETE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll_options_public_read"   ON public.poll_options;
DROP POLICY IF EXISTS "poll_options_public_update"  ON public.poll_options;
DROP POLICY IF EXISTS "poll_options_admin_insert"   ON public.poll_options;
DROP POLICY IF EXISTS "poll_options_admin_update"   ON public.poll_options;
DROP POLICY IF EXISTS "poll_options_admin_delete"   ON public.poll_options;

-- Anyone can read options of active polls.
CREATE POLICY "poll_options_public_read"
  ON public.poll_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_id AND p.active = true
    )
  );

-- Anyone can update vote counts (anonymous voting from frontend).
CREATE POLICY "poll_options_public_update"
  ON public.poll_options FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admins can insert new options.
CREATE POLICY "poll_options_admin_insert"
  ON public.poll_options FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can delete options.
CREATE POLICY "poll_options_admin_delete"
  ON public.poll_options FOR DELETE
  USING (public.is_admin());
