-- Keep article media cleanup active for deletes and image replacements.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE OR REPLACE FUNCTION public.notify_article_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _service_key TEXT;
BEGIN
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
