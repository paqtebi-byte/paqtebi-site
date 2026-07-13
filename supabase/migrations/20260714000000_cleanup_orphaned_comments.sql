-- ─────────────────────────────────────────────────────────────
-- Migration: cleanup_orphaned_comments
-- ─────────────────────────────────────────────────────────────

-- Replace the existing 60-day deletion job with one that also cleans up orphaned comments
SELECT cron.unschedule('delete-old-articles');

SELECT cron.schedule(
  'delete-old-articles',
  '0 3 * * *',
  $$
    -- 1. Delete the articles
    DELETE FROM public.articles
    WHERE created_at < NOW() - INTERVAL '60 days';

    -- 2. Delete orphaned comments and view events where the article no longer exists.
    -- (This also catches comments/views that were orphaned prior to this migration)
    DELETE FROM public.comments c
    WHERE (c.text LIKE '%[[paqtebi-view:%' OR c.text LIKE '%[[paqtebi-article:%')
      AND NOT EXISTS (
          SELECT 1
          FROM public.articles a
          WHERE REPLACE(REPLACE(TRIM(TRAILING '=' FROM encode(convert_to(a.id::text, 'utf8'), 'base64')), '+', '-'), '/', '_') = 
                COALESCE(
                  SUBSTRING(c.text FROM '\[\[paqtebi-view:([A-Za-z0-9_-]+)\]\]'),
                  SUBSTRING(c.text FROM '\[\[paqtebi-article:([A-Za-z0-9_-]+)\]\]')
                )
      );
  $$
);
