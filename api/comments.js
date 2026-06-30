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

  return data;
}

function mapComment(row, articleTitle) {
  const stored = decodeStoredCommentText(row.text);
  const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();
  return {
    id: row.id,
    articleId: stored.articleId || String(row.article_id ?? ""),
    author: row.author,
    text: stored.text,
    timestamp: Number(row.timestamp ?? createdAt),
    reactions: row.reactions ?? {},
    articleTitle,
  };
}

function encodeStoredCommentText(articleId, text) {
  const encodedArticleId = Buffer.from(String(articleId), "utf8").toString("base64url");
  return `[[paqtebi-article:${encodedArticleId}]]\n${text}`;
}

function decodeStoredCommentText(text = "") {
  const marker = String(text).match(/^\[\[paqtebi-article:([A-Za-z0-9_-]+)\]\]\n?/);
  if (!marker) return { articleId: "", text: String(text) };

  try {
    return {
      articleId: Buffer.from(marker[1], "base64url").toString("utf8"),
      text: String(text).slice(marker[0].length),
    };
  } catch {
    return { articleId: "", text: String(text).slice(marker[0].length) };
  }
}

async function resolveArticleTitles(rows) {
  const articleIds = [...new Set(rows.map((row) => row.article_id).filter(Boolean))];
  if (articleIds.length === 0) return new Map();

  const ids = articleIds
    .map((id) => `"${String(id).replaceAll('"', '\\"')}"`)
    .join(",");
  try {
    const articles = await supabaseRequest(
      `articles?select=id,title&id=in.(${ids})`,
      { method: "GET" },
    );

    return new Map((articles || []).map((article) => [article.id, article.title]));
  } catch (error) {
    console.warn("Could not resolve comment article titles:", error);
    return new Map();
  }
}

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url, "http://localhost");
      const articleId = url.searchParams.get("articleId");
      const rows = await supabaseRequest(
        "comments?select=id,article_id,author,text,created_at&order=created_at.desc&limit=200",
        { method: "GET" },
      );
      const mappedRows = (rows || []).map((row) => {
        const stored = decodeStoredCommentText(row.text);
        return { ...row, resolved_article_id: stored.articleId || String(row.article_id ?? "") };
      });
      const filteredRows = articleId
        ? mappedRows.filter((row) => row.resolved_article_id === articleId)
        : mappedRows;
      const titleByArticleId = await resolveArticleTitles(
        filteredRows.map((row) => ({ ...row, article_id: row.resolved_article_id })),
      );
      json(response, 200, {
        comments: filteredRows
          .slice(0, 50)
          .map((row) => mapComment(row, titleByArticleId.get(row.resolved_article_id))),
      });
      return;
    }

    if (request.method === "POST") {
      const body = await readBody(request);
      const articleId = String(body.articleId || "").trim();
      const author = String(body.author || "").trim();
      const text = String(body.text || "").trim();

      if (!articleId || !author || !text) {
        json(response, 400, { error: "Missing required comment fields" });
        return;
      }

      let rows;
      try {
        rows = await supabaseRequest(
          "comments?select=id,article_id,author,text,created_at",
          {
            method: "POST",
            headers: { Prefer: "return=representation, override=system_value" },
            body: JSON.stringify({
              article_id: articleId,
              author,
              text,
            }),
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!message.includes("article_id")) throw error;

        rows = await supabaseRequest(
          "comments?select=id,article_id,author,text,created_at",
          {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              author,
              text: encodeStoredCommentText(articleId, text),
            }),
          },
        );
      }
      const row = rows?.[0];
      const mappedRow = row
        ? { ...row, article_id: decodeStoredCommentText(row.text).articleId || String(row.article_id ?? "") }
        : null;
      const titleByArticleId = await resolveArticleTitles(mappedRow ? [mappedRow] : []);

      json(response, 200, {
        comment: mappedRow ? mapComment(mappedRow, titleByArticleId.get(mappedRow.article_id)) : null,
      });
      return;
    }

    if (request.method === "DELETE") {
      const url = new URL(request.url, "http://localhost");
      const id = url.searchParams.get("id");
      if (!id) {
        json(response, 400, { error: "Missing comment id" });
        return;
      }

      await supabaseRequest(
        `comments?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        },
      );
      json(response, 200, { success: true });
      return;
    }

    json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : "Comment request failed",
    });
  }
};
