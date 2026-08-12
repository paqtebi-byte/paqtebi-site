-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: backfill_view_article_ids  (v2 — corrected)
-- Reason   : The comments table has "articleId" (camelCase) as the real stored
--            column, and "article_id" (snake_case) is GENERATED ALWAYS AS
--            ("articleId"). The original INSERT code mistakenly tried to set the
--            generated column, which silently fell back to omitting the field
--            entirely — leaving "articleId" = NULL for all view rows.
-- Fix      : Populate "articleId" (the actual column) for every view row where
--            it is still NULL, by matching the base64url token in the text field
--            against every article id.  Same encoding formula used by the
--            existing orphan-cleanup cron jobs.
-- Safety   : Pure UPDATE on "articleId" only — no DELETEs, no schema changes.
--            Rows that already have "articleId" set are untouched (WHERE clause
--            requires "articleId" IS NULL).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.comments c
SET    "articleId" = a.id
FROM   public.articles a
WHERE  c.author      = '__paqtebi_view__'
  AND  c."articleId" IS NULL
  AND  c.text        LIKE '%[[paqtebi-view:%'
  AND  REPLACE(
         REPLACE(
           TRIM(TRAILING '=' FROM encode(convert_to(a.id::text, 'utf8'), 'base64')),
           '+', '-'
         ),
         '/', '_'
       )
       = SUBSTRING(c.text FROM '\[\[paqtebi-view:([A-Za-z0-9_-]+)\]\]');
