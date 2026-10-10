import test from "node:test";
import assert from "node:assert/strict";
import { createAnalyticsCache, ANALYTICS_CACHE_TTL_MS } from "../utils/analyticsCache.js";

test("pending reads share work, expire on schedule, and do not extend freshness on hits", async () => {
  let now = 0;
  let calls = 0;
  const cache = createAnalyticsCache({ now: () => now });
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.read("a", load), cache.read("a", load)]), [1, 1]);
  now = ANALYTICS_CACHE_TTL_MS - 1;
  assert.equal(await cache.read("a", load), 1);
  now++;
  assert.equal(await cache.read("a", load), 2);
});

test("failed reads are not retained", async () => {
  const cache = createAnalyticsCache();
  await assert.rejects(cache.read("a", async () => { throw new Error("failure"); }));
  assert.equal(await cache.read("a", async () => 2), 2);
});

test("clearing during a pending read cannot restore an obsolete snapshot", async () => {
  const cache = createAnalyticsCache();
  let finish;
  const old = cache.read("a", () => new Promise((resolve) => { finish = resolve; }));
  await Promise.resolve();
  cache.clear();
  assert.equal(await cache.read("a", async () => 2), 2);
  finish(1);
  assert.equal(await old, 1);
  assert.equal(await cache.read("a", async () => 3), 2);
});

test("entry limits bound memory and evicted reads are fetched again", async () => {
  const cache = createAnalyticsCache({ maxEntries: 2 });
  await cache.read("a", async () => 1);
  await cache.read("b", async () => 2);
  await cache.read("c", async () => 3);
  assert.equal(await cache.read("a", async () => 4), 4);
});
