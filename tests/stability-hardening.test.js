import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchWithTimeout, UpstreamTimeoutError } from '../api/_fetchWithTimeout.js';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('server-side upstream requests stop after their timeout', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });

  try {
    await assert.rejects(
      fetchWithTimeout('https://example.test', {}, 10),
      (error) => error instanceof UpstreamTimeoutError,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('browser services route requests through the shared timeout helper', () => {
  const serviceFiles = [
    'services/authService.ts',
    'services/currencyService.ts',
    'services/geminiService.ts',
    'services/mediaService.ts',
    'services/remoteApiService.ts',
    'services/weatherService.ts',
  ];

  for (const file of serviceFiles) {
    const source = readSource(file);
    assert.match(source, /fetchWithTimeout/);
    assert.doesNotMatch(source, /\bfetch\(/);
  }
});

test('corrupted local storage is removed and callers use validated fallbacks', () => {
  const helperSource = readSource('utils/safeStorage.ts');
  const authSource = readSource('services/authService.ts');
  const storageSource = readSource('services/storageService.ts');

  assert.match(helperSource, /JSON\.parse\(raw\)/);
  assert.match(helperSource, /localStorage\.removeItem\(key\)/);
  assert.match(authSource, /readLocalStorageJson/);
  assert.match(storageSource, /readLocalStorageJson/);
});

test('related articles use a stable order instead of reshuffling on render', () => {
  const source = readSource('components/ArticleDetail.tsx');

  assert.match(source, /const relatedArticles = useMemo/);
  assert.match(source, /getStableRelatedScore/);
  assert.doesNotMatch(source, /sort\(\(\) => 0\.5 - Math\.random\(\)\)/);
});
