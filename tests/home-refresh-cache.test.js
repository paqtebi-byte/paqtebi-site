import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hookSource = readFileSync(new URL('../hooks/useArticles.ts', import.meta.url), 'utf8');
const apiServiceSource = readFileSync(new URL('../services/apiService.ts', import.meta.url), 'utf8');
const remoteApiSource = readFileSync(new URL('../services/remoteApiService.ts', import.meta.url), 'utf8');

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

test('cold home load fetches hero and feed in parallel without waiting for analytics', () => {
  assert.match(
    hookSource,
    /Promise\.all\(\[[\s\S]*?fetchHeroArticle\(false\)[\s\S]*?fetchArticles\([\s\S]*?FEED_PAGE_SIZE \+ 1[\s\S]*?false,[\s\S]*?\)\)/,
  );
  assert.match(hookSource, /\.slice\(0, FEED_PAGE_SIZE\)/);
  assert.match(hookSource, /heroWasInPrimaryFeed/);
});

test('view counts hydrate after visible home content and use separate service caches', () => {
  assert.match(hookSource, /void apiService\.hydrateArticleViewCounts/);
  assert.match(hookSource, /hydrateVisibleViewCounts\([\s\S]*?localNews,[\s\S]*?loadedHero/);
  assert.match(apiServiceSource, /includeViewCounts \? "with-views" : "fast"/);
  assert.match(remoteApiSource, /includeViewCounts[\s\S]*?attachArticleViewCounts/);
});

test('article mutations invalidate the refresh cache', () => {
  assert.match(hookSource, /invalidateArticleCache[\s\S]*?sessionStorage\.removeItem\(HOME_PAGE_CACHE_KEY\)/);
});
