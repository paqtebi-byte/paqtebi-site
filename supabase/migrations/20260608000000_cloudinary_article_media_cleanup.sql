-- Keep article media cleanup active for deletes and image replacements.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE OR REPLACE FUNCTION public.notify_article_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _service_key TEXT;
  _project_url TEXT;
BEGIN
  SELECT
    MAX(decrypted_secret) FILTER (WHERE name = 'webhook_service_key'),
    MAX(decrypted_secret) FILTER (WHERE name = 'project_url')
    INTO _service_key, _project_url
    FROM vault.decrypted_secrets
   WHERE name IN ('webhook_service_key', 'project_url');

  IF _service_key IS NULL OR _project_url IS NULL THEN
    RAISE WARNING 'Article media cleanup skipped: required Vault secrets are missing';
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url     := rtrim(_project_url, '/') || '/functions/v1/cleanup-article-media',
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

DROP TRIGGER IF EXISTS on_article_deleted ON public.articles;
CREATE TRIGGER on_article_deleted
  AFTER DELETE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.notify_article_deleted();

DROP TRIGGER IF EXISTS on_article_media_replaced ON public.articles;
CREATE TRIGGER on_article_media_replaced
  AFTER UPDATE OF "imageUrl", video_thumbnail_url ON public.articles
  FOR EACH ROW
  WHEN (
    OLD."imageUrl" IS DISTINCT FROM NEW."imageUrl"
    OR OLD.video_thumbnail_url IS DISTINCT FROM NEW.video_thumbnail_url
  )
  EXECUTE FUNCTION public.notify_article_deleted();
