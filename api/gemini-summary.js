import crypto from "node:crypto";

const MODEL = "gemini-2.5-flash";
const MAX_TEXT_LENGTH = 12_000;
const REQUEST_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const rateLimits = new Map();
const summaryCache = new Map();

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_TEXT_LENGTH * 4) {
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

function getClientIp(request) {
  const forwarded = String(request.headers?.["x-forwarded-for"] || "");
  return forwarded.split(",")[0].trim() || request.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const current = rateLimits.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function getCachedSummary(cacheKey) {
  const cached = summaryCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    summaryCache.delete(cacheKey);
    return null;
  }
  return cached.summary;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(response, 503, { error: "AI summary service is not configured" });
  }

  if (isRateLimited(getClientIp(request))) {
    return json(response, 429, { error: "Too many summary requests" });
  }

  try {
    const body = await readBody(request);
    const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";

    if (!text) {
      return json(response, 400, { error: "Text is required" });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return json(response, 413, { error: "Text is too long" });
    }

    const cacheKey = crypto.createHash("sha256").update(text).digest("hex");
    const cachedSummary = getCachedSummary(cacheKey);
    if (cachedSummary) {
      return json(response, 200, { summary: cachedSummary, cached: true });
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
                text: `შეაჯამე მოცემული სტატია ქართულად 3-5 მოკლე პუნქტად. გამოყავი მხოლოდ მთავარი ფაქტები და დასკვნები.\n\n${text}`,
              }],
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 500,
            },
          }),
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiResponse.ok) {
      console.error(`[gemini-summary] Gemini returned ${geminiResponse.status}`);
      return json(response, 502, { error: "AI summary request failed" });
    }

    const data = await geminiResponse.json();
    const summary = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("\n")
      .trim();

    if (!summary) {
      return json(response, 502, { error: "AI returned an empty summary" });
    }

    summaryCache.set(cacheKey, { summary, expiresAt: Date.now() + CACHE_TTL_MS });
    return json(response, 200, { summary, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PAYLOAD_TOO_LARGE") {
      return json(response, 413, { error: "Payload is too large" });
    }

    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("[gemini-summary] Request failed", isTimeout ? "timeout" : error);
    return json(response, isTimeout ? 504 : 500, {
      error: isTimeout ? "AI summary request timed out" : "AI summary request failed",
    });
  }
}
