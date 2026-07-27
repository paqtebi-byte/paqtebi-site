import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import adminAuthHandler from "../api/admin-auth.js";
import cloudinaryImageHandler from "../api/cloudinary-image.js";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionFromRequest,
  setAdminSessionCookie,
  verifyAdminSessionToken,
} from "../server/adminSession.js";

const ROOT = resolve(import.meta.dirname, "..");
const ORIGINAL_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
const ORIGINAL_ADMIN_SECRET = process.env.ADMIN_SECRET_CODE;
const ORIGINAL_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ORIGINAL_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret-with-sufficient-entropy";
process.env.ADMIN_SECRET_CODE = "test-owner-secret";
process.env.VITE_SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

test.after(() => {
  restoreEnv("ADMIN_SESSION_SECRET", ORIGINAL_SESSION_SECRET);
  restoreEnv("ADMIN_SECRET_CODE", ORIGINAL_ADMIN_SECRET);
  restoreEnv("VITE_SUPABASE_URL", ORIGINAL_SUPABASE_URL);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", ORIGINAL_SERVICE_KEY);
});

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function admin(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    username: "owner",
    email: "owner@example.com",
    role: "owner",
    ...overrides,
  };
}

function request(body, headers = {}) {
  const raw = Buffer.from(JSON.stringify(body));
  return {
    method: "POST",
    headers,
    async *[Symbol.asyncIterator]() {
      yield raw;
    },
  };
}

function response() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: "",
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    end(value = "") {
      this.body = value;
    },
  };
}

test("admin session cookie is signed, HttpOnly, Secure and SameSite=Strict", () => {
  const res = response();
  setAdminSessionCookie(res, admin());

  const cookie = res.headers.get("set-cookie");
  assert.match(cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
  assert.match(cookie, /Path=\/api/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);

  const token = decodeURIComponent(cookie.match(/^[^=]+=([^;]+)/)[1]);
  assert.equal(verifyAdminSessionToken(token)?.sub, admin().id);
  assert.equal(verifyAdminSessionToken(`${token}tampered`), null);
});

test("expired sessions are rejected and a valid cookie is read from the request", () => {
  const issuedAt = Date.now();
  const token = createAdminSessionToken(admin(), issuedAt);
  const cookieRequest = {
    headers: { cookie: `other=value; ${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}` },
  };

  assert.equal(getAdminSessionFromRequest(cookieRequest)?.role, "owner");
  assert.equal(verifyAdminSessionToken(token, issuedAt + (9 * 60 * 60 * 1000)), null);
});

test("admin API authenticates session checks from the cookie instead of a JSON token", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([admin()]), { status: 200 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const token = createAdminSessionToken(admin());
  const res = response();
  await adminAuthHandler(
    request(
      { action: "session", token: "attacker-controlled-body-token" },
      { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}` },
    ),
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).admin.role, "owner");

  const missingCookieResponse = response();
  await adminAuthHandler(
    request({ action: "session", token }),
    missingCookieResponse,
  );
  assert.equal(missingCookieResponse.statusCode, 401);
});

test("Cloudinary upload rejects a body token when the HttpOnly cookie is absent", async () => {
  const res = response();
  await cloudinaryImageHandler(
    request({
      imageData: "data:image/png;base64,iVBORw0KGgo=",
      token: createAdminSessionToken(admin()),
    }),
    res,
  );

  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).success, false);
});

test("client code no longer stores or sends the custom admin token", () => {
  const authSource = readFileSync(resolve(ROOT, "services/authService.ts"), "utf8");
  const mediaSource = readFileSync(resolve(ROOT, "services/mediaService.ts"), "utf8");
  const adminApiSource = readFileSync(resolve(ROOT, "api/admin-auth.js"), "utf8");
  const cloudinarySource = readFileSync(resolve(ROOT, "api/cloudinary-image.js"), "utf8");

  assert.doesNotMatch(authSource, /getAdminToken|data\.token|localStorage\.setItem\(STORAGE_KEY_ADMIN_AUTH/);
  assert.doesNotMatch(mediaSource, /paqtebi_admin_auth|\btoken\b/);
  assert.doesNotMatch(adminApiSource, /body\.token/);
  assert.doesNotMatch(cloudinarySource, /body\.token|verifyAdminToken/);
});

test("CSP blocks inline scripts and the HTML contains no inline JavaScript handlers", () => {
  const vercelConfig = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf8"));
  const csp = vercelConfig.headers[0].headers.find((header) => header.key === "Content-Security-Policy").value;
  const scriptDirective = csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("script-src"));
  const html = readFileSync(resolve(ROOT, "index.html"), "utf8");

  assert.doesNotMatch(scriptDirective, /'unsafe-inline'/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i);
  assert.doesNotMatch(html, /\sonload\s*=/i);
});
