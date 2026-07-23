import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/comments.js";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value) {
      this.body = value;
    },
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function request(headers = {}) {
  return {
    method: "DELETE",
    url: "/api/comments?id=comment-1",
    headers,
  };
}

test.beforeEach(() => {
  process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
});

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
});

test("DELETE rejects requests without authentication", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return jsonResponse({});
  };

  const response = createResponse();
  await handler(request(), response);

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalled, false);
});

test("DELETE rejects an invalid Supabase access token", async () => {
  globalThis.fetch = async () => jsonResponse({ message: "invalid token" }, 401);

  const response = createResponse();
  await handler(request({ authorization: "Bearer invalid-token" }), response);

  assert.equal(response.statusCode, 401);
});

test("DELETE rejects authenticated non-admin users", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/auth/v1/user")) {
      return jsonResponse({ id: "user-1" });
    }
    if (String(url).includes("/rest/v1/users?")) {
      return jsonResponse([{ id: "user-1", role: "user" }]);
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const response = createResponse();
  await handler(request({ authorization: "Bearer user-token" }), response);

  assert.equal(response.statusCode, 403);
});

test("DELETE allows an authenticated admin and removes the comment", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).endsWith("/auth/v1/user")) {
      return jsonResponse({ id: "admin-1" });
    }
    if (String(url).includes("/rest/v1/users?")) {
      return jsonResponse([{ id: "admin-1", role: "admin" }]);
    }
    if (String(url).includes("/rest/v1/comments?")) {
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const response = createResponse();
  await handler(request({ authorization: "Bearer admin-token" }), response);

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).success, true);
  assert.equal(requests.at(-1).options.method, "DELETE");
});
