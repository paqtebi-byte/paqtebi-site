import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260724000000_harden_rls_policies.sql', import.meta.url),
  'utf8',
);
const remoteApi = readFileSync(
  new URL('../services/remoteApiService.ts', import.meta.url),
  'utf8',
);

test('admin roles are bound to auth uid without an email fallback', () => {
  assert.match(migration, /u\.id::text\s*=\s*\(SELECT auth\.uid\(\)\)::text/);
  assert.doesNotMatch(migration, /auth\.email\s*\(/);
  assert.match(migration, /SET search_path = ''/);
});

test('authenticated users cannot select legacy password columns', () => {
  assert.match(migration, /REVOKE SELECT ON TABLE public\.users FROM anon, authenticated/);
  assert.match(migration, /GRANT SELECT \(id, username, email, created_at, role\)/);
  assert.doesNotMatch(
    migration.match(/GRANT SELECT \([^)]+\)/)?.[0] || '',
    /password/,
  );
  assert.match(
    migration,
    /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\s+ON TABLE public\.users FROM anon, authenticated/,
  );
});

test('broad comment and poll update policies are removed', () => {
  assert.match(migration, /DROP POLICY IF EXISTS "comments_public_update"/);
  assert.match(migration, /GRANT UPDATE \(text\) ON TABLE public\.comments TO authenticated/);
  assert.match(migration, /DROP POLICY IF EXISTS "poll_options_public_update"/);
  assert.match(migration, /DROP POLICY IF EXISTS "poll_options_public_vote"/);
  assert.match(migration, /DROP POLICY IF EXISTS "Allow anonymous voting on poll options"/);
  assert.match(migration, /REVOKE UPDATE ON TABLE public\.poll_options FROM anon/);
});

test('comment reactions use the restricted database function', () => {
  assert.match(migration, /p_reaction NOT IN \('like', 'dislike', 'heart'\)/);
  assert.match(remoteApi, /\.rpc\(\s*"increment_comment_reaction"/);
  assert.doesNotMatch(remoteApi, /\.update\(\{ reactions \}\)/);
});
