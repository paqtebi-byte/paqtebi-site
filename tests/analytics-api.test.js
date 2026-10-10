import test from "node:test";
import assert from "node:assert/strict";
let handler;
let handlerVersion = 0;

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_NOW = Date.now;

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value) {
      this.body = value;
    },
  };
}

function request(articleId, headers = {}) {
  const body = JSON.stringify({ action: "view", articleId });
  return {
    method: "POST",
    url: "/api/analytics",
    headers,
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(body);
    },
  };
}

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test.beforeEach(async () => {
  ({ default: handler } = await import(`../api/analytics.js?test=${++handlerVersion}`));
  process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.ADMIN_SESSION_SECRET = "test-session-secret";
});

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
  Date.now = ORIGINAL_NOW;
});

test("POST rejects malformed article identifiers without touching Supabase", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return jsonResponse({});
  };

  const response = createResponse();
  await handler(request("../../not-an-article", { "x-forwarded-for": "198.51.100.1" }), response);

  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalled, false);
});

test("POST does not count a view for an article that does not exist", async () => {
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/rest\/v1\/articles\?/);
    return jsonResponse([]);
  };

  const response = createResponse();
  await handler(request("missing-article", { "x-forwarded-for": "198.51.100.2" }), response);

  assert.equal(response.statusCode, 404);
});

test("POST counts the first valid view and issues a signed visitor cookie", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("/rest/v1/articles?")) {
      return jsonResponse([{ id: "article-1" }]);
    }
    if (String(url).includes("select=id&author=")) {
      return jsonResponse([]);
    }
    if (options.method === "POST") {
      return jsonResponse([{ id: "view-1", article_id: "article-1" }]);
    }
    if (String(url).includes("article_id=eq.article-1")) {
      return jsonResponse([], 206, { "content-range": "0-0/1" });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const response = createResponse();
  await handler(request("article-1", { "x-forwarded-for": "198.51.100.3" }), response);

  const payload = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(payload.counted, true);
  assert.equal(payload.viewCount, 1);
  assert.match(response.headers["set-cookie"], /^paqtebi_viewer=.*HttpOnly; Secure; SameSite=Lax$/);
  assert.equal(requests.some(({ options }) => options.method === "POST"), true);
});

test("POST returns the current count without inserting a duplicate visitor view", async () => {
  let inserted = false;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes("/rest/v1/articles?")) {
      return jsonResponse([{ id: "article-2" }]);
    }
    if (String(url).includes("select=id&author=")) {
      return jsonResponse([{ id: "existing-view" }]);
    }
    if (options.method === "POST") inserted = true;
    if (String(url).includes("article_id=eq.article-2")) {
      return jsonResponse([], 206, { "content-range": "0-0/1" });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const firstResponse = createResponse();
  await handler(request("article-2", { "x-forwarded-for": "198.51.100.4" }), firstResponse);
  const cookie = firstResponse.headers["set-cookie"].split(";")[0];

  const response = createResponse();
  await handler(request("article-2", {
    cookie,
    "x-forwarded-for": "198.51.100.4",
  }), response);

  const payload = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(payload.counted, false);
  assert.equal(payload.viewCount, 1);
  assert.equal(inserted, false);
});

test("POST rate-limits excessive requests from the same IP", async () => {
  globalThis.fetch = async () => {
    throw new Error("Supabase should not be called for malformed requests");
  };

  let response;
  for (let index = 0; index < 61; index += 1) {
    response = createResponse();
    await handler(request("invalid/id", { "x-forwarded-for": "198.51.100.5" }), response);
  }

  assert.equal(response.statusCode, 429);
  assert.equal(response.headers["retry-after"], "60");
});

async function get(url) {
  const response = createResponse();
  await handler({ method: "GET", url, headers: {} }, response);
  return response;
}

test("GET rejects malformed, empty and oversized batches before calling Supabase", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("Unexpected Supabase request"); };
  for (const query of [
    "articleIds=", "articleIds=,", "articleIds=invalid%2Fid", "scope=unknown",
    "articleIds=a&articleIds=b", `articleIds=${"a".repeat(129)}`,
    `articleIds=${Array.from({ length: 101 }, (_, i) => `article-${i}`).join(",")}`,
    `articleIds=${"a,".repeat(6500)}`,
  ]) {
    assert.equal((await get(`/api/analytics?${query}`)).statusCode, 400, query.slice(0, 100));
  }
  assert.equal(calls, 0);
});

test("21 article counts use 21 primary queries; duplicate, reordered and concurrent reads reuse them", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    assert.doesNotMatch(String(url), /article_id=is.null|text=like/);
    return jsonResponse([], 206, { "content-range": "0-0/17" });
  };
  const ids = Array.from({ length: 21 }, (_, i) => `article-${i}`);
  const [first, second] = await Promise.all([
    get(`/api/analytics?articleIds=${ids.join(",")},article-0`),
    get(`/api/analytics?articleIds=${ids.toReversed().join(",")}`),
  ]);
  assert.equal(first.statusCode, 200);
  assert.deepEqual(JSON.parse(first.body), JSON.parse(second.body));
  assert.equal(JSON.parse(first.body).viewCounts["article-0"], 17);
  assert.equal(calls.length, 21);
  await get(`/api/analytics?articleIds=${ids.join(",")}`);
  assert.equal(calls.length, 21);
});

test("GET accepts the 100-ID boundary and preserves zero and historical counts", async () => {
  globalThis.fetch = async (url) => jsonResponse([], 206, {
    "content-range": String(url).includes("article_id=eq.article-0") ? "*/0" : "0-0/2544",
  });
  const result = await get(`/api/analytics?articleIds=${Array.from({ length: 100 }, (_, i) => `article-${i}`).join(",")}`);
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).viewCounts["article-1"], 2544);
  assert.equal(JSON.parse(result.body).viewCounts["article-0"], undefined);
});

test("article counts expire after 30 seconds and failures are retried instead of cached", async () => {
  let now = 100_000;
  Date.now = () => now;
  let calls = 0;
  globalThis.fetch = async () => jsonResponse([], 206, { "content-range": `0-0/${++calls}` });
  const first = await get("/api/analytics?articleIds=ttl-article");
  now += 29_999;
  assert.equal((await get("/api/analytics?articleIds=ttl-article")).body, first.body);
  now += 1;
  assert.equal(JSON.parse((await get("/api/analytics?articleIds=ttl-article")).body).viewCounts["ttl-article"], 2);
  let failed = true;
  globalThis.fetch = async () => failed
    ? jsonResponse({ message: "Database temporarily unavailable" }, 503)
    : jsonResponse([], 206, { "content-range": "0-0/7" });
  assert.equal((await get("/api/analytics?articleIds=failure-article")).statusCode, 500);
  failed = false;
  assert.equal(JSON.parse((await get("/api/analytics?articleIds=failure-article")).body).viewCounts["failure-article"], 7);
});

test("Most Read scans share a cached result without changing historical rankings", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return jsonResponse([
      { article_id: "popular" }, { article_id: "popular" },
      { article_id: "other" },
    ]);
  };
  const results = await Promise.all(Array.from({ length: 4 }, () => get("/api/analytics?scope=articleCounts")));
  results.forEach((result) => assert.deepEqual(JSON.parse(result.body).viewCounts, { popular: 2, other: 1 }));
  assert.equal(calls, 1);
});

test("a tracked view invalidates article counts and Most Read snapshots", async () => {
  let count = 1;
  let readCalls = 0;
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url);
    if (path.includes("/articles?")) return jsonResponse([{ id: "mutation-article" }]);
    if (path.includes("select=id&author=")) return jsonResponse([]);
    if (options.method === "POST") { count++; return jsonResponse([{ id: "new-view" }]); }
    readCalls++;
    if (path.includes("article_id=eq.")) return jsonResponse([], 206, { "content-range": `0-0/${count}` });
    return jsonResponse(Array.from({ length: count }, () => ({ article_id: "mutation-article" })));
  };
  await get("/api/analytics?articleIds=mutation-article");
  await get("/api/analytics?scope=articleCounts");
  const response = createResponse();
  await handler(request("mutation-article", { "x-forwarded-for": "198.51.100.6" }), response);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).viewCount, 2);
  assert.equal(JSON.parse((await get("/api/analytics?articleIds=mutation-article")).body).viewCounts["mutation-article"], 2);
  assert.equal(JSON.parse((await get("/api/analytics?scope=articleCounts")).body).viewCounts["mutation-article"], 2);
  assert.equal(readCalls, 5);
});
