import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260727234500_columns_slow_retention.sql', import.meta.url),
  'utf8',
);

test('columns are excluded from the regular 30/60-day retention policy', () => {
  assert.match(migration, /'სვეტები'/);
  assert.match(migration, /INTERVAL '30 days'/);
  assert.match(migration, /INTERVAL '60 days'/);
  assert.match(migration, /category NOT IN \([\s\S]*'სვეტები'[\s\S]*\)/);
});

test('only one oldest column older than one year is deleted per daily run', () => {
  assert.match(migration, /category = 'სვეტები'/);
  assert.match(migration, /INTERVAL '365 days'/);
  assert.match(migration, /ORDER BY created_at ASC, id ASC/);
  assert.match(migration, /LIMIT 1/);
});

test('previously archived columns are restored without changing other categories', () => {
  assert.match(
    migration,
    /UPDATE public\.articles[\s\S]*SET is_archived = false[\s\S]*WHERE category = 'სვეტები'[\s\S]*AND is_archived = true/,
  );
});
