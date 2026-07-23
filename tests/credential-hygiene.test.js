import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CLIENT_SCRIPTS = [
  'query.cjs',
  'check_categories.cjs',
  'check_cron.cjs',
  'check_archived_media.cjs',
];
const SENSITIVE_SOURCE_FILES = [
  ...CLIENT_SCRIPTS,
  'scripts/supabase-client.cjs',
  'supabase/migrations/20260602170600_article_archiving_v2.sql',
  'supabase/migrations/20260608000000_cloudinary_article_media_cleanup.sql',
];
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/;
const PROJECT_URL_PATTERN = /https:\/\/[a-z0-9]+\.supabase\.co/i;

test('diagnostic scripts contain no embedded Supabase credentials', () => {
  for (const file of SENSITIVE_SOURCE_FILES) {
    const source = readFileSync(resolve(ROOT, file), 'utf8');
    assert.doesNotMatch(source, JWT_PATTERN, `${file} contains an embedded JWT`);
    assert.doesNotMatch(source, PROJECT_URL_PATTERN, `${file} contains an embedded project URL`);
  }
});

test('diagnostic scripts use the shared environment-based Supabase client', () => {
  const helper = readFileSync(resolve(ROOT, 'scripts/supabase-client.cjs'), 'utf8');
  assert.match(helper, /process\.env\.(?:SUPABASE_URL|VITE_SUPABASE_URL)/);
  assert.match(helper, /process\.env\.(?:SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY)/);

  for (const file of CLIENT_SCRIPTS) {
    const source = readFileSync(resolve(ROOT, file), 'utf8');
    assert.match(source, /scripts\/supabase-client\.cjs/);
  }
});

test('obsolete migration runner is removed', () => {
  assert.equal(existsSync(resolve(ROOT, 'run_migration.cjs')), false);
});
