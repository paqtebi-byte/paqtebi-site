-- Support canonical article URLs in the form /article/e2372b6a/english-slug.
-- Eight hexadecimal characters give over four billion possible prefixes. The
-- unique index makes an accidental prefix collision fail loudly on insertion.
CREATE UNIQUE INDEX IF NOT EXISTS articles_short_id_unique
  ON public.articles ((left(id::text, 8)));

CREATE OR REPLACE FUNCTION public.get_article_by_short_id(p_short_id text)
RETURNS SETOF public.articles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT a.*
  FROM public.articles AS a
  WHERE left(a.id::text, 8) = lower(p_short_id)
    AND coalesce(a.is_archived, false) = false
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_article_by_short_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_article_by_short_id(text) TO anon, authenticated;
