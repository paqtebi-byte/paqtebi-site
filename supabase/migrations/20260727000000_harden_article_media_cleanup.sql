-- Authenticate article-media cleanup webhooks with a short-lived HMAC signature.
-- The service-role JWT remains only for Supabase's Edge gateway. The function
-- itself authorizes the database trigger using media_cleanup_webhook_secret.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_article_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _service_key text;
  _project_url text;
  _signing_secret text;
  _issued_at bigint;
  _media jsonb;
  _body jsonb;
  _signature text;
BEGIN
  SELECT
    max(decrypted_secret) FILTER (WHERE name = 'webhook_service_key'),
    max(decrypted_secret) FILTER (WHERE name = 'project_url'),
    max(decrypted_secret) FILTER (WHERE name = 'media_cleanup_webhook_secret')
  INTO _service_key, _project_url, _signing_secret
  FROM vault.decrypted_secrets
  WHERE name IN ('webhook_service_key', 'project_url', 'media_cleanup_webhook_secret');

  IF _service_key IS NULL OR _project_url IS NULL OR length(_signing_secret) < 32 THEN
    RAISE WARNING 'Article media cleanup skipped: required Vault secrets are missing';
    RETURN OLD;
  END IF;

  IF TG_OP = 'DELETE' THEN
    _media := jsonb_strip_nulls(jsonb_build_object(
      'imageUrl', OLD."imageUrl",
      'videoUrl', OLD.video_url,
      'videoThumbnailUrl', OLD.video_thumbnail_url
    ));
  ELSE
    _media := jsonb_strip_nulls(jsonb_build_object(
      'imageUrl', CASE WHEN OLD."imageUrl" IS DISTINCT FROM NEW."imageUrl" THEN OLD."imageUrl" END,
      'videoUrl', CASE WHEN OLD.video_url IS DISTINCT FROM NEW.video_url THEN OLD.video_url END,
      'videoThumbnailUrl', CASE
        WHEN OLD.video_thumbnail_url IS DISTINCT FROM NEW.video_thumbnail_url THEN OLD.video_thumbnail_url
      END
    ));
  END IF;

  IF _media = '{}'::jsonb THEN
    RETURN OLD;
  END IF;

  _issued_at := floor(extract(epoch FROM clock_timestamp()))::bigint;
  _body := jsonb_build_object(
    'version', 1,
    'event', TG_OP,
    'articleId', OLD.id::text,
    'issuedAt', _issued_at,
    'media', _media
  );
  _signature := encode(
    extensions.hmac(
      convert_to(_body::text, 'UTF8'),
      convert_to(_signing_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  PERFORM net.http_post(
    url := rtrim(_project_url, '/') || '/functions/v1/cleanup-article-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key,
      'X-Cleanup-Signature', _signature
    ),
    body := _body,
    timeout_milliseconds := 10000
  );

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_article_deleted() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_article_deleted ON public.articles;
CREATE TRIGGER on_article_deleted
  AFTER DELETE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_article_deleted();

DROP TRIGGER IF EXISTS on_article_media_replaced ON public.articles;
CREATE TRIGGER on_article_media_replaced
  AFTER UPDATE OF "imageUrl", video_url, video_thumbnail_url ON public.articles
  FOR EACH ROW
  WHEN (
    OLD."imageUrl" IS DISTINCT FROM NEW."imageUrl"
    OR OLD.video_url IS DISTINCT FROM NEW.video_url
    OR OLD.video_thumbnail_url IS DISTINCT FROM NEW.video_thumbnail_url
  )
  EXECUTE FUNCTION public.notify_article_deleted();
