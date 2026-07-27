import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const rootUrl = new URL('../', import.meta.url);
const readSource = (path) => readFileSync(new URL(path, rootUrl), 'utf8');

test('temporary audit artifacts are not kept in the project', () => {
  const removedArtifacts = [
    'implementation_plan.md',
    'metadata.json',
    'nbg_headers.txt',
    'nbg_test.json',
    'orphaned.json',
    'test-ai.ts',
    'test.cjs',
  ];

  for (const path of removedArtifacts) {
    assert.equal(existsSync(new URL(path, rootUrl)), false, `${path} should not be tracked`);
  }
});

test('environment documentation separates public values from server secrets', () => {
  const envExample = readSource('.env.example');
  const envTypes = readSource('vite-env.d.ts');
  const readme = readSource('README.md');

  assert.match(envTypes, /VITE_SUPABASE_URL/);
  assert.match(envTypes, /VITE_SUPABASE_ANON_KEY/);
  assert.match(envExample, /MEDIA_CLEANUP_WEBHOOK_SECRET/);
  assert.match(readme, /All other values are server-only secrets/);
  assert.match(readme, /deploys automatically from the GitHub `main` branch/);
});

test('obsolete UI dependencies and dead source modules stay removed', () => {
  const packageJson = JSON.parse(readSource('package.json'));
  const removedSources = [
    'components/AdminRegister.tsx',
    'components/SeoHead.tsx',
    'hooks/useDynamicMetaTags.ts',
    'hooks/useNavigation.ts',
    'services/categoryService.ts',
    'services/commentService.ts',
  ];

  assert.equal(packageJson.dependencies?.['react-helmet'], undefined);
  assert.equal(packageJson.devDependencies?.['@types/react-helmet'], undefined);
  assert.equal(packageJson.devDependencies?.['@types/dompurify'], undefined);
  assert.equal(packageJson.overrides?.quill, '2.0.2');

  for (const path of removedSources) {
    assert.equal(existsSync(new URL(path, rootUrl)), false, `${path} should stay removed`);
  }
});
