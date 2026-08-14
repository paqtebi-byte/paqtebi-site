-- Add English URL slug column to articles.
-- Populated automatically by the app when an article is created or updated via the admin panel.
-- NULL for articles created before this feature; they fall back to Georgian transliteration in the URL.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS slug TEXT;

-- Unique partial index: prevents duplicate slugs but allows many NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_unique
  ON public.articles (slug)
  WHERE slug IS NOT NULL;
