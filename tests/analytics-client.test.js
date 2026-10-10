import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createAnalyticsCache, MAX_ANALYTICS_ARTICLE_IDS } from "../utils/analyticsCache.js";

const originalNow = Date.now;
test.afterEach(() => { Date.now = originalNow; });

function createService(fetch, articleRows = []) {
  let articleQueries = 0;
  const supabase = {
    from() {
      articleQueries++;
      const query = {
        select() { return query; },
        in() { return query; },
        eq() { return Promise.resolve({ data: articleRows, error: null }); },
      };
      return query;
    },
  };
  const modules = {
    "../config/database": { DATABASE_CONFIG: { USE_LOCAL_STORAGE: false, TABLES: { ARTICLES: "articles" } } },
    "./supabaseClient": { default: () => supabase },
    "../utils/fetchWithTimeout": { fetchWithTimeout: fetch },
    "../utils/safeStorage": { isRecord: () => true, readLocalStorageJson: (_key, fallback) => fallback },
    "../utils/analyticsCache.js": { createAnalyticsCache, MAX_ANALYTICS_ARTICLE_IDS },
  };
  const source = readFileSync(new URL("../services/remoteApiService.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    assert.ok(modules[name], `Unexpected runtime import: ${name}`);
    return modules[name];
  }, module, module.exports);
  return { service: module.exports.default, articleQueries: () => articleQueries };
}

test("client count reads canonicalize batches, share pending work and expire after 30 seconds", async () => {
  let now = 100_000;
  Date.now = () => now;
  let calls = 0;
  const { service } = createService(async () => new Response(JSON.stringify({ viewCounts: { a: ++calls, b: 9 } })));
  const articles = [{ id: "a" }, { id: "b" }];
  const [first, second] = await Promise.all([
    service.hydrateArticleViewCounts(articles),
    service.hydrateArticleViewCounts(articles.toReversed()),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(first.map((article) => article.viewCount), [1, 9]);
  assert.deepEqual(second.map((article) => article.viewCount), [9, 1]);
  now += 29_999;
  await service.hydrateArticleViewCounts(articles);
  assert.equal(calls, 1);
  now++;
  const fresh = await service.hydrateArticleViewCounts(articles);
  assert.equal(fresh[0].viewCount, 2);
  assert.equal(calls, 2);
});

test("large client lists split into valid unique batches without dropping article counts", async () => {
  const batches = [];
  const { service } = createService(async (url) => {
    const ids = new URL(url, "https://example.test").searchParams.get("articleIds").split(",");
    batches.push(ids);
    return new Response(JSON.stringify({ viewCounts: Object.fromEntries(ids.map((id) => [id, 7])) }));
  });
  const articles = Array.from({ length: 205 }, (_, i) => ({ id: `article-${i}` }));
  const result = await service.hydrateArticleViewCounts([...articles, articles[0]]);
  assert.deepEqual(batches.map((ids) => ids.length), [100, 100, 5]);
  assert.equal(result.length, 206);
  assert.ok(result.every((article) => article.viewCount === 7));
});

test("Most Read deduplicates both analytics and article hydration while preserving ranking", async () => {
  let now = 100_000;
  Date.now = () => now;
  let calls = 0;
  const { service, articleQueries } = createService(async () => {
    calls++;
    return new Response(JSON.stringify({ viewCounts: { a: 7, b: 12 } }));
  }, [{ id: "a", title: "A" }, { id: "b", title: "B" }]);
  const results = await Promise.all([service.fetchPopularArticles(5), service.fetchPopularArticles(5)]);
  assert.equal(calls, 1);
  assert.equal(articleQueries(), 1);
  assert.deepEqual(results[0].map((article) => [article.id, article.viewCount]), [["b", 12], ["a", 7]]);
  await service.fetchPopularArticles(5);
  assert.equal(calls, 1);
  now += 30_000;
  await service.fetchPopularArticles(5);
  assert.equal(calls, 2);
  assert.equal(articleQueries(), 2);
});

test("cache invalidation refreshes both public count reads and Most Read", async () => {
  let calls = 0;
  const { service } = createService(async () => {
    calls++;
    return new Response(JSON.stringify({ viewCounts: { a: calls } }));
  }, [{ id: "a" }]);
  await service.hydrateArticleViewCounts([{ id: "a" }]);
  await service.fetchPopularArticles(5);
  service.invalidateAnalyticsCache();
  assert.equal((await service.hydrateArticleViewCounts([{ id: "a" }]))[0].viewCount, 3);
  assert.equal((await service.fetchPopularArticles(5))[0].viewCount, 4);
});

test("a successful duplicate-view response invalidates reads without changing visitor tracking", async () => {
  let calls = 0;
  const { service } = createService(async (_url, options) => {
    if (options?.method === "POST") return new Response(JSON.stringify({ counted: false, viewCount: 8 }));
    return new Response(JSON.stringify({ viewCounts: { a: ++calls } }));
  });
  await service.hydrateArticleViewCounts([{ id: "a" }]);
  assert.equal(await service.trackArticleView("a"), 8);
  assert.equal((await service.hydrateArticleViewCounts([{ id: "a" }]))[0].viewCount, 2);
});
