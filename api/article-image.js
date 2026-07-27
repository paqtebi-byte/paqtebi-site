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

const ALLOWED_UNSPLASH_QUERY_PARAMS = new Set(["auto", "crop", "fit", "h", "q", "w"]);

function hasSafeUrlIdentity(url) {
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    !url.hash
  );
}

function getDecodedPathSegments(url) {
  try {
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.includes("\\") || decodedPath.includes("\0")) return null;

    const segments = decodedPath.split("/").filter(Boolean);
    if (segments.some((segment) => segment === "." || segment === "..")) return null;
    return segments;
  } catch {
    return null;
  }
}

function isAllowedCloudinaryUrl(url) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !/^[a-zA-Z0-9_-]+$/.test(cloudName)) return false;
  if (url.hostname !== "res.cloudinary.com" || url.search) return false;

  const segments = getDecodedPathSegments(url);
  if (!segments || segments.length < 6) return false;
  if (segments[0] !== cloudName || segments[1] !== "image" || segments[2] !== "upload") {
    return false;
  }

  const assetPath = /^v\d+$/.test(segments[3]) ? segments.slice(4) : segments.slice(3);
  return assetPath.length >= 3 && assetPath[0] === "paqtebi" && assetPath[1] === "articles";
}

function isAllowedUnsplashUrl(url) {
  if (url.hostname !== "images.unsplash.com") return false;
  if (!/^\/photo-[a-zA-Z0-9_-]+$/.test(url.pathname)) return false;
  return [...url.searchParams.keys()].every((key) => ALLOWED_UNSPLASH_QUERY_PARAMS.has(key));
}

export function isAllowedImageRedirectUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return false;

  try {
    const url = new URL(value);
    if (!hasSafeUrlIdentity(url)) return false;
    return isAllowedCloudinaryUrl(url) || isAllowedUnsplashUrl(url);
  } catch {
    return false;
  }
}

export default async function handler(request, response) {
  const article = await fetchArticle(request.query?.id);
  const imageUrl = article?.imageUrl || article?.image_url || "";

  if (!imageUrl) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  if (isAllowedImageRedirectUrl(imageUrl)) {
    response.statusCode = 302;
    response.setHeader("location", imageUrl);
    response.setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=3600");
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
