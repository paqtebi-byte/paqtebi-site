import test from "node:test";
import assert from "node:assert/strict";

import handler, { isAllowedImageRedirectUrl } from "../api/article-image.js";

const CLOUD_NAME = "test-cloud";
const ORIGINAL_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

process.env.CLOUDINARY_CLOUD_NAME = CLOUD_NAME;

test.after(() => {
  if (ORIGINAL_CLOUD_NAME === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
  else process.env.CLOUDINARY_CLOUD_NAME = ORIGINAL_CLOUD_NAME;
});

test("allows only the project's Cloudinary article folder and approved Unsplash images", () => {
  assert.equal(
    isAllowedImageRedirectUrl(
      `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v123/paqtebi/articles/example.jpg`,
    ),
    true,
  );
  assert.equal(
    isAllowedImageRedirectUrl(
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800&auto=format&fit=crop",
    ),
    true,
  );
});

test("rejects untrusted redirect targets and Cloudinary paths outside the article folder", () => {
  const rejected = [
    "http://images.unsplash.com/photo-1504711434969-e33886168f5c",
    "https://images.unsplash.com.evil.example/photo-1504711434969-e33886168f5c",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?url=https://evil.example",
    `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v123/other/folder/example.jpg`,
    "https://res.cloudinary.com/attacker-cloud/image/upload/v123/paqtebi/articles/example.jpg",
    "https://127.0.0.1/internal.png",
    "https://example.com/phishing",
    "not-a-url",
  ];

  for (const value of rejected) {
    assert.equal(isAllowedImageRedirectUrl(value), false, value);
  }
});

function createResponse() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: undefined,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    end(body) {
      this.body = body;
    },
  };
}

test("the endpoint does not emit a Location header for an untrusted database URL", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalSupabaseUrl = process.env.VITE_SUPABASE_URL;
  const originalAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  process.env.VITE_SUPABASE_URL = "https://project.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ imageUrl: "https://evil.example/phishing" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalSupabaseUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = originalSupabaseUrl;
    if (originalAnonKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
    else process.env.VITE_SUPABASE_ANON_KEY = originalAnonKey;
  });

  const response = createResponse();
  await handler({ query: { id: "article-id" } }, response);

  assert.equal(response.statusCode, 404);
  assert.equal(response.headers.has("location"), false);
  assert.equal(response.body, "Not found");
});
