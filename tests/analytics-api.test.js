import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/analytics.js";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

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

test.beforeEach(() => {
  process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.ADMIN_SESSION_SECRET = "test-session-secret";
});

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
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
    if (String(url).includes("select=id,article_id,text")) {
      return jsonResponse([
        { id: "view-1", article_id: "article-1", text: "[[paqtebi-view:YXJ0aWNsZS0x]]" },
      ]);
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
    if (String(url).includes("select=id,article_id,text")) {
      return jsonResponse([
        { id: "existing-view", article_id: "article-2", text: "[[paqtebi-view:YXJ0aWNsZS0y]]" },
      ]);
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
