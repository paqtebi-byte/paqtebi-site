import crypto from "node:crypto";

const MODEL = process.env.GEMINI_MODEL || "gemini-pro";
const REQUEST_TIMEOUT_MS = 10_000;
// Cache: title hash → English slug, TTL 7 days (slugs don't change)
const slugCache = new Map();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

/** Sanitise the Gemini output into a safe URL slug. */
function sanitiseSlug(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")   // keep ASCII letters, digits, spaces, hyphens
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return json(response, 503, { error: "Gemini API key not configured" });
  }

  try {
    const body = await readBody(request);
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) return json(response, 400, { error: "title is required" });
    if (title.length > 500) return json(response, 413, { error: "title too long" });

    // Cache hit
    const cacheKey = crypto.createHash("sha256").update(title).digest("hex");
    const cached = slugCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return json(response, 200, { slug: cached.slug, cached: true });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let geminiResponse;

    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Translate this Georgian news headline to English and return ONLY a URL slug.\nRules: lowercase, words separated by hyphens, no special characters, max 70 chars.\nReturn the slug and nothing else — no explanation, no quotes.\n\nHeadline: ${title}`,
              }],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 60 },
          }),
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiResponse.ok) {
      const err = await geminiResponse.json().catch(() => ({}));
      console.error(`[translate-slug] Gemini ${geminiResponse.status}:`, err?.error?.message);
      return json(response, 502, { error: "Translation request failed", details: err?.error?.message });
    }

    const data = await geminiResponse.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("").trim();
    const slug = sanitiseSlug(raw);

    if (!slug) return json(response, 502, { error: "Gemini returned empty slug" });

    slugCache.set(cacheKey, { slug, expiresAt: Date.now() + CACHE_TTL_MS });
    return json(response, 200, { slug, cached: false });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("[translate-slug] Request failed:", isTimeout ? "timeout" : error);
    return json(response, isTimeout ? 504 : 500, {
      error: isTimeout ? "Translation timed out" : "Translation failed",
    });
  }
}
