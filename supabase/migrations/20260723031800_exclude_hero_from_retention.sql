-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: exclude_hero_from_retention
-- Reason   : Articles with layout='hero' serve as the site's hero/banner and
--            must NEVER be auto-archived or auto-deleted by the 30/60-day
--            retention cron jobs. The hero article is autonomous from the feed
--            and should persist until manually changed by an admin.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. archive-old-articles: exclude hero layout from 30-day archiving
--    (cron.schedule with same name replaces the job in-place — no unschedule needed)
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
        'ლაივი'
      )
      AND (layout IS NULL OR layout != 'hero');
  $$
);

-- 2. delete-old-articles: exclude hero layout from 60-day deletion.
--    Comments/views orphan cleanup (step 2 inside the job) is preserved verbatim.
SELECT cron.unschedule('delete-old-articles');
SELECT cron.schedule(
  'delete-old-articles',
  '0 3 * * *',
  $$
    -- Step 1: Hard delete regular articles older than 60 days
    -- Hero articles and media/link categories are excluded
    DELETE FROM public.articles
    WHERE created_at < NOW() - INTERVAL '60 days'
      AND category NOT IN (
        'ვიდეო რეპორტაჟები',
        'პოდკასტები',
        'საინტერესო',
        'ლაივი'
      )
      AND (layout IS NULL OR layout != 'hero');

    -- Step 2: Purge orphaned comments/view events
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

-- 3. Safety: If a hero article was already archived by a previous cron run, restore it
UPDATE public.articles
SET is_archived = false
WHERE layout = 'hero'
  AND is_archived = true;
