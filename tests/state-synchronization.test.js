import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('bookmarks synchronize in the current tab and across browser tabs', () => {
  const source = readSource('hooks/useBookmarks.ts');

  assert.match(source, /window\.dispatchEvent\(new CustomEvent<string\[]>\(BOOKMARKS_CHANGED_EVENT/);
  assert.match(source, /window\.addEventListener\('storage', handleStorageChange\)/);
  assert.match(source, /window\.addEventListener\(BOOKMARKS_CHANGED_EVENT, handleLocalChange\)/);
  assert.match(source, /bookmarkedIdsRef\.current/);
});

test('duplicate active toast messages are suppressed', () => {
  const source = readSource('context/ToastContext.tsx');

  assert.match(source, /prev\.some\(\(toast\) => toast\.message === message && toast\.type === type\)/);
});

test('admin dashboard consumes the reactive authenticated admin', () => {
  const source = readSource('components/AdminDashboard.tsx');

  assert.match(source, /const \{ logoutAdmin, currentAdmin \} = useAuthContext\(\)/);
  assert.doesNotMatch(source, /getCurrentAdmin\(/);
});

test('article mutations invalidate hook cache and stale requests cannot repopulate caches', () => {
  const hookSource = readSource('hooks/useArticles.ts');
  const serviceSource = readSource('services/apiService.ts');

  assert.equal((hookSource.match(/invalidateArticleCache\(\);/g) || []).length, 3);
  assert.match(hookSource, /requestCacheVersion !== articleCacheVersion/);
  assert.match(serviceSource, /articleCacheGeneration \+= 1/);
  assert.match(serviceSource, /requestGeneration === this\.articleCacheGeneration/);
  assert.match(serviceSource, /this\.articleRequests\.get\(key\) === request/);
  assert.match(serviceSource, /this\.heroRequest === request/);
});
