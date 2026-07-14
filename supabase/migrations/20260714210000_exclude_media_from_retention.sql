-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: exclude_media_categories_from_cron_retention
-- Reason   : ვიდეო რეპორტაჟები / პოდკასტები / საინტერესო / ლაივი store only
--            external URLs (YouTube / video links) — never uploaded files.
--            They should remain permanently visible, never auto-archived or
--            auto-deleted by the 30/60-day retention policy.
-- Verified : category values confirmed by live DB query 2026-07-14.
--            All 12 media rows are currently is_archived=false — no retroactive
--            un-archive step required.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. archive-old-articles: exclude all 4 media categories from 30-day archiving
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
      );
  $$
);

-- 2. delete-old-articles: exclude all 4 media categories from 60-day deletion.
--    Comments/views orphan cleanup (step 2 inside the job) is preserved verbatim
--    from 20260714000000_cleanup_orphaned_comments.sql.
SELECT cron.unschedule('delete-old-articles');
SELECT cron.schedule(
  'delete-old-articles',
  '0 3 * * *',
  $$
    -- Step 1: Hard delete regular articles older than 60 days
    -- (media/link categories are excluded — only external URL rows, no storage cost)
    DELETE FROM public.articles
    WHERE created_at < NOW() - INTERVAL '60 days'
      AND category NOT IN (
        'ვიდეო რეპორტაჟები',
        'პოდკასტები',
        'საინტერესო',
        'ლაივი'
      );

    -- Step 2: Purge orphaned comments/view events
    -- (unchanged from 20260714000000_cleanup_orphaned_comments.sql)
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
