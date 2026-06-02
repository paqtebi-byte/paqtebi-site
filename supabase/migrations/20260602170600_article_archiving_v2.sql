-- ─────────────────────────────────────────────────────────────
-- Migration: article_archiving_v2
-- Fixes: no custom GUC vars; URL hardcoded; key from Vault
-- ─────────────────────────────────────────────────────────────

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- 2. Add is_archived column (idempotent)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_articles_is_archived
  ON public.articles (is_archived)
  WHERE is_archived = false;

-- 3. pg_cron — soft archive after 30 days (daily 02:00 UTC)
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

-- 4. pg_cron — hard delete after 60 days (daily 03:00 UTC)
SELECT cron.schedule(
  'delete-old-articles',
  '0 3 * * *',
  $$
    DELETE FROM public.articles
    WHERE created_at < NOW() - INTERVAL '60 days';
  $$
);

-- 5. Trigger function — URL hardcoded, key pulled from Vault at runtime
CREATE OR REPLACE FUNCTION public.notify_article_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _service_key TEXT;
BEGIN
  -- Read service_role_key from Vault at runtime (never stored in code)
  SELECT decrypted_secret
    INTO _service_key
    FROM vault.decrypted_secrets
   WHERE name = 'webhook_service_key'
   LIMIT 1;

  PERFORM net.http_post(
    url     := 'https://scokpscivzurygaxabxo.supabase.co/functions/v1/cleanup-article-media',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_key
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

-- 6. Attach trigger
DROP TRIGGER IF EXISTS on_article_deleted ON public.articles;
CREATE TRIGGER on_article_deleted
  AFTER DELETE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.notify_article_deleted();
