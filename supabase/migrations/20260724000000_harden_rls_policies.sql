-- Harden authorization helpers and close broad UPDATE policies.

-- Roles are bound exclusively to the authenticated Supabase user id.
-- SECURITY DEFINER is required because public.users is itself protected by RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS u
    WHERE u.id::text = (SELECT auth.uid())::text
      AND u.role IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS u
    WHERE u.id::text = (SELECT auth.uid())::text
      AND u.role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- RLS filters rows, not columns. Remove table-wide SELECT and expose only the
-- fields the authenticated client needs for its own profile/role check.
REVOKE SELECT ON TABLE public.users FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.users FROM anon, authenticated;
GRANT SELECT (id, username, email, created_at, role)
  ON TABLE public.users TO authenticated;

DROP POLICY IF EXISTS "users_self_read" ON public.users;
CREATE POLICY "users_self_read"
  ON public.users FOR SELECT
  TO authenticated
  USING (id::text = (SELECT auth.uid())::text);

-- A public UPDATE policy allowed callers to replace a comment's author,
-- article id and text. Authors may now update only their own comment text.
DROP POLICY IF EXISTS "comments_public_update" ON public.comments;
DROP POLICY IF EXISTS "comments_author_update" ON public.comments;
DROP POLICY IF EXISTS "comments_admin_update" ON public.comments;

REVOKE UPDATE ON TABLE public.comments FROM anon, authenticated;
GRANT UPDATE (text) ON TABLE public.comments TO authenticated;

CREATE POLICY "comments_author_update"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users AS u
      WHERE u.id::text = (SELECT auth.uid())::text
        AND u.username = comments.author
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users AS u
      WHERE u.id::text = (SELECT auth.uid())::text
        AND u.username = comments.author
    )
  );

CREATE POLICY "comments_admin_update"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reactions use a narrow atomic function instead of UPDATE access to the row.
CREATE OR REPLACE FUNCTION public.increment_comment_reaction(
  p_comment_id text,
  p_reaction text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_rows integer;
BEGIN
  IF p_reaction NOT IN ('like', 'dislike', 'heart') THEN
    RETURN false;
  END IF;

  UPDATE public.comments
  SET reactions = jsonb_set(
    COALESCE(reactions, '{}'::jsonb),
    ARRAY[p_reaction],
    to_jsonb(COALESCE((reactions ->> p_reaction)::integer, 0) + 1),
    true
  )
  WHERE id::text = p_comment_id;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_comment_reaction(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_comment_reaction(text, text)
  TO anon, authenticated;

-- Anonymous callers previously had unrestricted UPDATE access to every poll
-- option. Only authenticated admins/owners may edit options now.
DROP POLICY IF EXISTS "poll_options_public_update" ON public.poll_options;
DROP POLICY IF EXISTS "poll_options_public_vote" ON public.poll_options;
DROP POLICY IF EXISTS "poll_options_admin_update" ON public.poll_options;
DROP POLICY IF EXISTS "Allow admin delete on poll options" ON public.poll_options;
DROP POLICY IF EXISTS "Allow admin update on poll options" ON public.poll_options;
DROP POLICY IF EXISTS "Allow anonymous voting on poll options" ON public.poll_options;
DROP POLICY IF EXISTS "Allow public read for active poll options" ON public.poll_options;

REVOKE UPDATE ON TABLE public.poll_options FROM anon;
GRANT UPDATE ON TABLE public.poll_options TO authenticated;

CREATE POLICY "poll_options_admin_update"
  ON public.poll_options FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
