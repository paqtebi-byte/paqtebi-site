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

function encodeViewText(articleId) {
  const encodedArticleId = Buffer.from(String(articleId), "utf8").toString("base64url");
  return `[[paqtebi-view:${encodedArticleId}]]`;
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, serviceKey } = getConfig();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase server credentials are not configured");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
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

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const [totalArticles, totalViews] = await Promise.all([
        getExactCount("articles?select=id&is_archived=eq.false"),
        getExactCount(`comments?select=id&author=eq.${encodeURIComponent(VIEW_EVENT_AUTHOR)}`),
      ]);

      json(response, 200, { totalArticles, totalViews });
      return;
    }

    if (request.method === "POST") {
      const body = await readBody(request);
      const action = String(body.action || "").trim();
      const articleId = String(body.articleId || "").trim();

      if (action !== "view" || !articleId) {
        json(response, 400, { error: "Missing view payload" });
        return;
      }

      const { data } = await supabaseRequest("comments?select=id", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          author: VIEW_EVENT_AUTHOR,
          text: encodeViewText(articleId),
        }),
      });

      json(response, 200, { success: true, id: data?.[0]?.id || null });
      return;
    }

    json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : "Analytics request failed",
    });
  }
}
