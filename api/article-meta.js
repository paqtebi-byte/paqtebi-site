const SITE_URL = "https://www.paqtebi.ge";
const SITE_NAME = "Paqtebi";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getPublicImageUrl(article, articleUrl) {
  const imageUrl = article.imageUrl || article.image_url || "";
  if (imageUrl.startsWith("data:image/")) {
    return `${SITE_URL}/api/article-image?id=${encodeURIComponent(article.id)}`;
  }
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return articleUrl;
}

async function fetchArticle(id) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !id) return null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
  );

  if (!response.ok) return null;
  const articles = await response.json();
  return Array.isArray(articles) ? articles[0] : null;
}

export default async function handler(request, response) {
  const id = request.query?.id;
  const article = await fetchArticle(id);
  const articleUrl = `${SITE_URL}/article/${encodeURIComponent(id || "")}`;

  if (!article) {
    response.statusCode = 404;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${articleUrl}"></head><body></body></html>`);
    return;
  }

  const title = article.title || "Paqtebi";
  const description = stripHtml(article.summary || article.content || title).slice(0, 240);
  const image = getPublicImageUrl(article, articleUrl);

  response.setHeader("content-type", "text/html; charset=utf-8");
  response.setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=3600");
  response.end(`<!doctype html>
<html lang="ka">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(articleUrl)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(articleUrl)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:secure_url" content="${escapeHtml(image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <meta http-equiv="refresh" content="0;url=${escapeHtml(articleUrl)}">
  </head>
  <body>
    <a href="${escapeHtml(articleUrl)}">${escapeHtml(title)}</a>
  </body>
</html>`);
}
