async function fetchArticle(id) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !id) return null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(id)}&select=imageUrl,image_url`,
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
  const article = await fetchArticle(request.query?.id);
  const imageUrl = article?.imageUrl || article?.image_url || "";

  if (!imageUrl) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    response.statusCode = 302;
    response.setHeader("location", imageUrl);
    response.end();
    return;
  }

  const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  response.setHeader("content-type", match[1]);
  response.setHeader("cache-control", "public, s-maxage=86400, stale-while-revalidate=604800");
  response.end(Buffer.from(match[2], "base64"));
}
