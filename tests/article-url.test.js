import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rootUrl = new URL("../", import.meta.url);
const readSource = (path) => readFileSync(new URL(path, rootUrl), "utf8");

test("article links use the canonical short-ID-first URL shape", () => {
  const app = readSource("App.tsx");

  assert.match(app, /article\.id\.slice\(0, 8\)/);
  assert.match(app, /`\/article\/\$\{shortId\}\$\{slug \? `\/\$\{slug\}` : ""\}`/);
  assert.match(app, /canonicalPath = `\/article\/\$\{article\.id\.slice\(0, 8\)\}\/\$\{article\.slug\}`/);
  assert.doesNotMatch(app, /`\/article\/\$\{slug\}\/\$\{article\.id\}`/);
});

test("short article IDs resolve through a collision-safe database function", () => {
  const service = readSource("services/remoteApiService.ts");
  const migration = readSource("supabase/migrations/20260815000000_add_short_article_id_lookup.sql");

  assert.match(service, /rpc\("get_article_by_short_id"/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS articles_short_id_unique/);
  assert.match(migration, /left\(id::text, 8\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_article_by_short_id/);
});

test("search and social crawlers receive canonical metadata for the new route", () => {
  const vercel = readSource("vercel.json");
  const meta = readSource("api/article-meta.js");

  assert.match(vercel, /\/article\/:first\/:second/);
  assert.match(vercel, /Googlebot\|bingbot/);
  assert.match(meta, /article\.id\.slice\(0, 8\)/);
  assert.match(meta, /get_article_by_short_id/);
});
