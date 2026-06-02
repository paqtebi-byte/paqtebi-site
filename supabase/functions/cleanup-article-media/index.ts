import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "article-media"; // change to your actual bucket name

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { imageUrl, video_url, video_thumbnail_url } = body;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  /** Extract storage path from a full Supabase Storage URL */
  function extractPath(url: string | null | undefined): string | null {
    if (!url) return null;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  }

  const paths = [
    extractPath(imageUrl),
    extractPath(video_url),
    extractPath(video_thumbnail_url),
  ].filter(Boolean) as string[];

  if (paths.length === 0) {
    return new Response(JSON.stringify({ deleted: [] }), { status: 200 });
  }

  const { data, error } = await supabase.storage.from(BUCKET).remove(paths);

  if (error) {
    console.error("Storage cleanup error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ deleted: data }), { status: 200 });
});
