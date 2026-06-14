import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "article-media"; // change to your actual bucket name

function extractCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("cloudinary.com")) return null;

    const marker = "/image/upload/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const afterUpload = parsed.pathname.slice(markerIndex + marker.length);
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    const withoutExtension = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, "");

    return decodeURIComponent(withoutExtension) || null;
  } catch {
    return null;
  }
}

async function deleteCloudinaryImage(publicId: string): Promise<{ publicId: string; result: string }> {
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary cleanup is not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signatureBuffer = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(signaturePayload),
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const formData = new FormData();
  formData.set("public_id", publicId);
  formData.set("api_key", apiKey);
  formData.set("timestamp", String(timestamp));
  formData.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Cloudinary delete failed: ${response.status}`);
  }

  return { publicId, result: data?.result || "unknown" };
}

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

  const cloudinaryPublicIds = [
    extractCloudinaryPublicId(imageUrl),
    extractCloudinaryPublicId(video_thumbnail_url),
  ].filter(Boolean) as string[];

  if (paths.length === 0 && cloudinaryPublicIds.length === 0) {
    return new Response(JSON.stringify({ deleted: [], cloudinaryDeleted: [] }), { status: 200 });
  }

  let data: unknown[] = [];
  if (paths.length > 0) {
    const result = await supabase.storage.from(BUCKET).remove(paths);
    if (result.error) {
      console.error("Storage cleanup error:", result.error);
      return new Response(JSON.stringify({ error: result.error.message }), { status: 500 });
    }

    data = result.data || [];
  }

  const cloudinaryDeleted = [];
  for (const publicId of cloudinaryPublicIds) {
    try {
      cloudinaryDeleted.push(await deleteCloudinaryImage(publicId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cloudinary cleanup failed";
      console.error("Cloudinary cleanup error:", message);
      return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ deleted: data, cloudinaryDeleted }), { status: 200 });
});
