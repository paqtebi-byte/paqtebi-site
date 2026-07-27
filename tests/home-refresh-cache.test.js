import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hookSource = readFileSync(new URL('../hooks/useArticles.ts', import.meta.url), 'utf8');

test('home refresh restores the last successful first page without showing the full skeleton', () => {
  assert.match(hookSource, /HOME_PAGE_CACHE_KEY = "paqtebi_home_page_cache_v1"/);
  assert.match(hookSource, /useState<Article\[\]>\(\(\) => initialHomeCache\?\.articles \?\? \[\]\)/);
  assert.match(hookSource, /useState<boolean>\(\(\) => !initialHomeCache\)/);
  assert.match(hookSource, /setLoading\(false\);[\s\S]*?setError\(null\);/);
});

test('cached hero and feed revalidate in parallel while preserving the 20-item pagination contract', () => {
  assert.match(hookSource, /const FEED_PAGE_SIZE = 20/);
  assert.match(hookSource, /Promise\.all\(\[[\s\S]*?fetchHeroArticle\(\)[\s\S]*?loadNews\("all", p, FEED_PAGE_SIZE/);
  assert.match(hookSource, /resolvedHero\.id !== cachedHome\.heroArticle\.id/);
  assert.match(hookSource, /preserveVisibleArticlesOnEmpty && localNews\.length === 0/);
});

test('article mutations invalidate the refresh cache', () => {
  assert.match(hookSource, /invalidateArticleCache[\s\S]*?sessionStorage\.removeItem\(HOME_PAGE_CACHE_KEY\)/);
});
