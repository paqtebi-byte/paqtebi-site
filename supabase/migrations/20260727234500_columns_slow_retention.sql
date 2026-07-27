-- Keep the "სვეტები" category visible for one full year, then remove at most
-- one oldest eligible row per day. All existing media and hero exemptions are
-- preserved, while every other regular article keeps the 30/60-day policy.

SELECT cron.schedule(
  'archive-old-articles',
  '0 2 * * *',
  $$
    UPDATE public.articles
    SET is_archived = true
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND is_archived = false
      AND category NOT IN (
        'ვიდეო რეპორტაჟები',
        'პოდკასტები',
        'საინტერესო',
        'ლაივი',
        'სვეტები'
      )
      AND (layout IS NULL OR layout != 'hero');
  $$
);

SELECT cron.unschedule('delete-old-articles');
SELECT cron.schedule(
  'delete-old-articles',
  '0 3 * * *',
  $$
    -- Regular articles retain the existing 60-day deletion policy.
    DELETE FROM public.articles
    WHERE created_at < NOW() - INTERVAL '60 days'
      AND category NOT IN (
        'ვიდეო რეპორტაჟები',
        'პოდკასტები',
        'საინტერესო',
        'ლაივი',
        'სვეტები'
      )
      AND (layout IS NULL OR layout != 'hero');

    -- Columns remain for at least 365 days. Delete only the single oldest
    -- eligible row on each daily run so cleanup progresses gradually.
    DELETE FROM public.articles
    WHERE id IN (
      SELECT id
      FROM public.articles
      WHERE category = 'სვეტები'
        AND created_at < NOW() - INTERVAL '365 days'
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    );

    -- Preserve the existing orphaned analytics/comment cleanup.
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

-- Restore columns that a previous 30-day job may already have archived.
UPDATE public.articles
SET is_archived = false
WHERE category = 'სვეტები'
  AND is_archived = true;
