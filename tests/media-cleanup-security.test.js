import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const edgeFunctionPath = new URL(
  "../supabase/functions/cleanup-article-media/index.ts",
  import.meta.url,
);
const migrationPath = new URL(
  "../supabase/migrations/20260727000000_harden_article_media_cleanup.sql",
  import.meta.url,
);

test("media cleanup requires a short-lived HMAC-signed request", async () => {
  const source = await readFile(edgeFunctionPath, "utf8");

  assert.match(source, /MEDIA_CLEANUP_WEBHOOK_SECRET/);
  assert.match(source, /x-cleanup-signature/i);
  assert.match(source, /createHmac\(rawBody, webhookSecret\)/);
  assert.match(source, /constantTimeEqual\(signature, expectedSignature\)/);
  assert.match(source, /MAX_REQUEST_AGE_SECONDS/);
  assert.doesNotMatch(source, /authHeader\s*!==\s*`Bearer/);
});

test("media cleanup only accepts owned Cloudinary and Supabase media paths", async () => {
  const source = await readFile(edgeFunctionPath, "utf8");

  assert.match(source, /parsed\.hostname !== "res\.cloudinary\.com"/);
  assert.match(source, /`\/\$\{cloudName\}\/image\/upload\/`/);
  assert.match(source, /CLOUDINARY_FOLDER = "paqtebi\/articles\/"/);
  assert.match(source, /parsed\.origin !== expectedOrigin/);
  assert.match(source, /segment === "\.\."/);
  assert.match(source, /rejectedUrlCount/);
});

test("database trigger signs cleanup payloads and only sends replaced media", async () => {
  const source = await readFile(migrationPath, "utf8");

  assert.match(source, /media_cleanup_webhook_secret/);
  assert.match(source, /extensions\.hmac/);
  assert.match(source, /'X-Cleanup-Signature', _signature/);
  assert.match(source, /OLD\."imageUrl" IS DISTINCT FROM NEW\."imageUrl" THEN OLD\."imageUrl"/);
  assert.match(source, /OLD\.video_url IS DISTINCT FROM NEW\.video_url THEN OLD\.video_url/);
  assert.match(source, /AFTER UPDATE OF "imageUrl", video_url, video_thumbnail_url/);
  assert.match(source, /REVOKE ALL ON FUNCTION public\.notify_article_deleted\(\) FROM PUBLIC/);
});
