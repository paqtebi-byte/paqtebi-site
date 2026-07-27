import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { withSingleRetry } from "../utils/singleRetry.js";

const ROOT = resolve(import.meta.dirname, "..");

test("single retry returns the second successful result", async () => {
  let attempts = 0;
  const result = await withSingleRetry(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary failure");
    return "loaded";
  });

  assert.equal(result, "loaded");
  assert.equal(attempts, 2);
});

test("single retry propagates the second failure without retrying forever", async () => {
  let attempts = 0;
  await assert.rejects(
    withSingleRetry(async () => {
      attempts += 1;
      throw new Error("still unavailable");
    }),
    /still unavailable/,
  );

  assert.equal(attempts, 2);
});

test("useArticles always clears loading after the retry sequence", () => {
  const source = readFileSync(resolve(ROOT, "hooks/useArticles.ts"), "utf8");
  assert.match(source, /withSingleRetry/);
  assert.match(source, /finally\s*{\s*setLoading\(false\);\s*}/);
});

test("password reset uses only the active Supabase flow", () => {
  const source = readFileSync(resolve(ROOT, "services/authService.ts"), "utf8");
  assert.equal((source.match(/resetPasswordForEmail\(/g) || []).length, 1);
  assert.equal((source.match(/auth\.updateUser\(/g) || []).length, 1);
  assert.doesNotMatch(source, /accounts\.find\([^\n]*resetToken/);
  assert.doesNotMatch(source, /export const loginAdmin\s*=/);
  assert.doesNotMatch(source, /getAdminAccounts|verifyEmail|checkAdminAuth/);
});
