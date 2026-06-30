-- Make the comments table match the fields used by the site and admin panel.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS "timestamp" BIGINT;

UPDATE public.comments
SET "timestamp" = (EXTRACT(EPOCH FROM COALESCE(created_at, NOW())) * 1000)::BIGINT
WHERE "timestamp" IS NULL;

ALTER TABLE public.comments
  ALTER COLUMN "timestamp" SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS comments_article_id_timestamp_idx
  ON public.comments (article_id, "timestamp" DESC);
