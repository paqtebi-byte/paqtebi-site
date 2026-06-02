-- ─────────────────────────────────────────────────────────────
-- Migration: article_archiving
-- ─────────────────────────────────────────────────────────────

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Add is_archived column
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_articles_is_archived
  ON public.articles (is_archived)
  WHERE is_archived = false;

-- 3. pg_cron — soft archive after 30 days (runs daily 02:00 UTC)
SELECT cron.schedule(
  'archive-old-articles',
  '0 2 * * *',
  $$
    UPDATE public.articles
    SET is_archived = true
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND is_archived = false;
  $$
);

-- 4. pg_cron — hard delete after 60 days (runs daily 03:00 UTC)
SELECT cron.schedule(
  'delete-old-articles',
  '0 3 * * *',
  $$
    DELETE FROM public.articles
    WHERE created_at < NOW() - INTERVAL '60 days';
  $$
);

-- 5. DB trigger → Edge Function via pg_net on article DELETE
CREATE OR REPLACE FUNCTION public.notify_article_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url     := current_setting('app.edge_function_url') || '/cleanup-article-media',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := jsonb_build_object(
      'imageUrl',            OLD."imageUrl",
      'video_url',           OLD.video_url,
      'video_thumbnail_url', OLD.video_thumbnail_url
    )
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_article_deleted ON public.articles;
CREATE TRIGGER on_article_deleted
  AFTER DELETE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.notify_article_deleted();
