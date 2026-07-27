import crypto from "node:crypto";
import { fetchWithTimeout } from "./_fetchWithTimeout.js";

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return { supabaseUrl, serviceKey };
}

const VIEW_EVENT_AUTHOR = "__paqtebi_view__";
const VIEWER_COOKIE = "paqtebi_viewer";
const VIEW_DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const rateLimits = new Map();

function encodeViewText(articleId, visitorKey = "") {
  const encodedArticleId = Buffer.from(String(articleId), "utf8").toString("base64url");
  const marker = `[[paqtebi-view:${encodedArticleId}]]`;
  return visitorKey ? `${marker}\n[[paqtebi-visitor:${visitorKey}]]` : marker;
}

function decodeViewArticleId(row) {
  if (row?.article_id) return String(row.article_id);

  const marker = String(row?.text || "").match(/^\[\[paqtebi-view:([A-Za-z0-9_-]+)\]\]/);
  if (!marker) return "";

  try {
    return Buffer.from(marker[1], "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function getHeader(request, name) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : String(value || "");
}

function getClientIp(request) {
  const forwardedFor = getHeader(request, "x-forwarded-for");
  return forwardedFor.split(",")[0]?.trim() || getHeader(request, "x-real-ip") || "unknown";
}

function consumeRateLimit(request) {
  const now = Date.now();
  const clientIp = getClientIp(request);
  const current = rateLimits.get(clientIp);

  if (!current || current.resetAt <= now) {
    rateLimits.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;

  if (rateLimits.size > 5000) {
    for (const [key, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(key);
    }
  }

  return { allowed: true, retryAfter: 0 };
}

function parseCookies(request) {
  return getHeader(request, "cookie")
    .split(";")
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator < 1) return cookies;
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (name) cookies[name] = value;
      return cookies;
    }, {});
}

function getVisitorSecret() {
  const { serviceKey } = getConfig();
  return process.env.ADMIN_SESSION_SECRET || serviceKey;
}

function signVisitorId(visitorId, secret) {
  return crypto.createHmac("sha256", secret).update(visitorId).digest("base64url");
}

function isValidVisitorCookie(value, secret) {
  const [visitorId, signature, ...extra] = String(value || "").split(".");
  if (extra.length > 0 || !/^[a-f0-9]{32}$/.test(visitorId || "") || !signature) return false;

  const expected = signVisitorId(visitorId, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function getOrCreateVisitor(request, response) {
  const secret = getVisitorSecret();
  if (!secret) throw new Error("Analytics visitor secret is not configured");

  const stored = parseCookies(request)[VIEWER_COOKIE];
  let visitorId;

  if (isValidVisitorCookie(stored, secret)) {
    [visitorId] = stored.split(".");
  } else {
    visitorId = crypto.randomBytes(16).toString("hex");
    const signedValue = `${visitorId}.${signVisitorId(visitorId, secret)}`;
    response.setHeader(
      "set-cookie",
      `${VIEWER_COOKIE}=${signedValue}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
    );
  }

  const anonymousId = crypto
    .createHmac("sha256", secret)
    .update(visitorId)
    .digest("base64url")
    .slice(0, 22);
  return anonymousId;
}

function isValidArticleId(articleId) {
  return articleId.length <= 128 && /^[A-Za-z0-9_-]+$/.test(articleId);
}

async function articleExists(articleId) {
  const { data } = await supabaseRequest(
    `articles?id=eq.${encodeURIComponent(articleId)}&is_archived=eq.false&select=id&limit=1`,
    { method: "GET" },
  );
  return Boolean(data?.[0]?.id);
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, serviceKey } = getConfig();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase server credentials are not configured");
  }

  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || text || `Supabase request failed: ${response.status}`;
    throw new Error(message);
  }

  return { data, headers: response.headers };
}

function parseTotalCount(headers) {
  const contentRange = headers.get("content-range") || "";
  const total = contentRange.split("/")[1];
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getExactCount(path) {
  const { headers } = await supabaseRequest(path, {
    method: "GET",
    headers: {
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  return parseTotalCount(headers);
}

async function getArticleViewCounts(articleIds = []) {
  const requestedIds = new Set(articleIds.filter(Boolean));
  let allData = [];
  const limit = 1000;
  const maxPages = 50;

  for (let page = 0; page < maxPages; page++) {
    const start = page * limit;
    const end = start + limit - 1;

    const { data } = await supabaseRequest(
      "comments?select=id,article_id,text&author=eq.__paqtebi_view__",
      {
        method: "GET",
        headers: { Range: `${start}-${end}` },
      }
    );

    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < limit) break;
  }

  if (allData.length >= maxPages * limit) {
    console.warn(`getArticleViewCounts reached maximum pagination limit of ${maxPages} pages.`);
  }

  return allData.reduce((counts, row) => {
    const articleId = decodeViewArticleId(row);
    if (!articleId || (requestedIds.size > 0 && !requestedIds.has(articleId))) {
      return counts;
    }

    counts[articleId] = (counts[articleId] || 0) + 1;
    return counts;
  }, {});
}

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url, "http://localhost");
      const articleIds = String(url.searchParams.get("articleIds") || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (articleIds.length > 0 || url.searchParams.get("scope") === "articleCounts") {
        const viewCounts = await getArticleViewCounts(articleIds);
        json(response, 200, { viewCounts });
        return;
      }

      const [totalArticles, totalViews] = await Promise.all([
        getExactCount("articles?select=id&is_archived=eq.false"),
        getExactCount(`comments?select=id&author=eq.${encodeURIComponent(VIEW_EVENT_AUTHOR)}`),
      ]);

      json(response, 200, { totalArticles, totalViews });
      return;
    }

    if (request.method === "POST") {
      const limit = consumeRateLimit(request);
      if (!limit.allowed) {
        response.setHeader("retry-after", String(limit.retryAfter));
        json(response, 429, { error: "Too many view requests" });
        return;
      }

      const body = await readBody(request);
      const action = String(body.action || "").trim();
      const articleId = String(body.articleId || "").trim();

      if (action !== "view" || !articleId || !isValidArticleId(articleId)) {
        json(response, 400, { error: "Missing view payload" });
        return;
      }

      if (!(await articleExists(articleId))) {
        json(response, 404, { error: "Article not found" });
        return;
      }

      const anonymousVisitorId = getOrCreateVisitor(request, response);
      const timeBucket = Math.floor(Date.now() / VIEW_DEDUPE_WINDOW_MS).toString(36);
      const visitorKey = `${timeBucket}:${anonymousVisitorId}`;
      const viewText = encodeViewText(articleId, visitorKey);
      const { data: existingViews } = await supabaseRequest(
        `comments?select=id&author=eq.${encodeURIComponent(VIEW_EVENT_AUTHOR)}&text=eq.${encodeURIComponent(viewText)}&limit=1`,
        { method: "GET" },
      );

      if (existingViews?.length) {
        const viewCounts = await getArticleViewCounts([articleId]);
        json(response, 200, {
          success: true,
          counted: false,
          articleId,
          viewCount: viewCounts[articleId] || 0,
        });
        return;
      }

      let data;
      try {
        ({ data } = await supabaseRequest("comments?select=id,article_id,text", {
          method: "POST",
          headers: { Prefer: "return=representation, override=system_value" },
          body: JSON.stringify({
            article_id: articleId,
            author: VIEW_EVENT_AUTHOR,
            text: viewText,
          }),
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!message.includes("article_id")) throw error;

        ({ data } = await supabaseRequest("comments?select=id,article_id,text", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            author: VIEW_EVENT_AUTHOR,
            text: viewText,
          }),
        }));
      }

      const viewCounts = await getArticleViewCounts([articleId]);

      json(response, 200, {
        success: true,
        counted: true,
        id: data?.[0]?.id || null,
        articleId,
        viewCount: viewCounts[articleId] || 0,
      });
      return;
    }

    json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : "Analytics request failed",
    });
  }
}
