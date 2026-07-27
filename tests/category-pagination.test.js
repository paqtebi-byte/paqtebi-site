import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const hookSource = readFileSync(new URL('../hooks/useArticles.ts', import.meta.url), 'utf8');
const apiSource = readFileSync(new URL('../services/apiService.ts', import.meta.url), 'utf8');
const remoteSource = readFileSync(new URL('../services/remoteApiService.ts', import.meta.url), 'utf8');

test('category selection requests the full category from the data service', () => {
  assert.match(appSource, /loadCategoryNews\(category, 1\)/);
  assert.match(hookSource, /apiService\.fetchArticles\(contentType, pageParam, limitParam, heroId, feedOnly, category\)/);
  assert.match(apiSource, /RemoteApiService\.fetchArticles\(contentType, page, limit, excludeId, feedOnly, category\)/);
  assert.match(remoteSource, /mainQuery = mainQuery\.eq\("category", category\)/);
});

test('category pagination keeps the same 20-item page size and loads the selected category page', () => {
  assert.match(hookSource, /const FEED_PAGE_SIZE = 20/);
  assert.match(appSource, /loadCategoryNews\(selectedCategory, newPage\)/);
  assert.doesNotMatch(appSource, /!searchQuery && selectedCategory === FEED_CATEGORIES\[0\] && \(/);
});

test('a slower previous category request cannot overwrite the latest selection', () => {
  assert.match(hookSource, /listRequestId = \+\+latestListRequestId/);
  assert.match(hookSource, /listRequestId !== latestListRequestId/);
});
