const BUCKET = "article-media";
const CLOUDINARY_FOLDER = "paqtebi/articles/";
const MAX_BODY_BYTES = 16 * 1024;
const MAX_REQUEST_AGE_SECONDS = 5 * 60;

type CleanupMedia = {
  imageUrl?: string;
  videoUrl?: string;
  videoThumbnailUrl?: string;
};

type CleanupRequest = {
  version: 1;
  event: "DELETE" | "UPDATE";
  articleId: string;
  issuedAt: number;
  media: CleanupMedia;
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left.toLowerCase());
  const rightBytes = new TextEncoder().encode(right.toLowerCase());
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

async function createHmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToHex(new Uint8Array(signature));
}

function isCleanupRequest(value: unknown): value is CleanupRequest {
  if (!value || typeof value !== "object") return false;

  const request = value as Record<string, unknown>;
  if (request.version !== 1) return false;
  if (request.event !== "DELETE" && request.event !== "UPDATE") return false;
  if (typeof request.articleId !== "string" || request.articleId.length < 1 || request.articleId.length > 200) {
    return false;
  }
  if (!Number.isInteger(request.issuedAt) || (request.issuedAt as number) <= 0) return false;
  if (!request.media || typeof request.media !== "object" || Array.isArray(request.media)) return false;

  const allowedKeys = new Set(["imageUrl", "videoUrl", "videoThumbnailUrl"]);
  for (const [key, mediaUrl] of Object.entries(request.media as Record<string, unknown>)) {
    if (!allowedKeys.has(key)) return false;
    if (typeof mediaUrl !== "string" || mediaUrl.length < 1 || mediaUrl.length > 4096) return false;
  }

  return true;
}

function extractStoragePath(url: string, supabaseUrl: string): string | null {
  try {
    const parsed = new URL(url);
    const expectedOrigin = new URL(supabaseUrl).origin;
    if (parsed.origin !== expectedOrigin || parsed.search || parsed.hash) return null;

    const marker = `/storage/v1/object/public/${BUCKET}/`;
    if (!parsed.pathname.startsWith(marker)) return null;

    const encodedPath = parsed.pathname.slice(marker.length);
    const path = decodeURIComponent(encodedPath);
    const segments = path.split("/");
    if (!path || path.includes("\\") || segments.some((segment) => !segment || segment === "." || segment === "..")) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

function extractCloudinaryPublicId(url: string, cloudName: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" || parsed.search || parsed.hash) {
      return null;
    }

    const marker = `/${cloudName}/image/upload/`;
    if (!parsed.pathname.startsWith(marker)) return null;

    const encodedAssetPath = parsed.pathname.slice(marker.length);
    const assetPath = decodeURIComponent(encodedAssetPath).replace(/^v\d+\//, "");
    const publicId = assetPath.replace(/\.[a-zA-Z0-9]+$/, "");
    const segments = publicId.split("/");

    if (
      !publicId.startsWith(CLOUDINARY_FOLDER) ||
      publicId.includes("\\") ||
      segments.some((segment) => !segment || segment === "." || segment === "..")
    ) {
      return null;
    }

    return publicId;
  } catch {
    return null;
  }
}

async function deleteCloudinaryImage(
  publicId: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
): Promise<{ publicId: string; result: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signatureBuffer = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(signaturePayload),
  );

  const formData = new FormData();
  formData.set("public_id", publicId);
  formData.set("api_key", apiKey);
  formData.set("timestamp", String(timestamp));
  formData.set("signature", bytesToHex(new Uint8Array(signatureBuffer)));

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
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const contentType = req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse({ error: "Content-Type must be application/json" }, 415);
  }

  const configuredLength = Number(req.headers.get("content-length") || 0);
  if (configuredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request body is too large" }, 413);
  }

  const webhookSecret = Deno.env.get("MEDIA_CLEANUP_WEBHOOK_SECRET");
  const signature = req.headers.get("x-cleanup-signature")?.trim();
  if (!webhookSecret || webhookSecret.length < 32) {
    console.error("Media cleanup webhook secret is missing or too short");
    return jsonResponse({ error: "Media cleanup is not configured" }, 503);
  }
  if (!signature || !/^[a-fA-F0-9]{64}$/.test(signature)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request body is too large" }, 413);
  }

  const expectedSignature = await createHmac(rawBody, webhookSecret);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (!isCleanupRequest(body)) {
    return jsonResponse({ error: "Invalid cleanup request" }, 400);
  }

  const requestAge = Math.abs(Math.floor(Date.now() / 1000) - body.issuedAt);
  if (requestAge > MAX_REQUEST_AGE_SECONDS) {
    return jsonResponse({ error: "Expired cleanup request" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !cloudName || !apiKey || !apiSecret) {
    console.error("Media cleanup provider configuration is incomplete");
    return jsonResponse({ error: "Media cleanup is not configured" }, 503);
  }

  const mediaUrls = [...new Set(Object.values(body.media))];
  const storagePaths = [...new Set(
    mediaUrls.map((url) => extractStoragePath(url, supabaseUrl)).filter((path): path is string => Boolean(path)),
  )];
  const cloudinaryPublicIds = [...new Set(
    mediaUrls.map((url) => extractCloudinaryPublicId(url, cloudName)).filter((id): id is string => Boolean(id)),
  )];

  const rejectedUrls = mediaUrls.filter((url) =>
    !extractStoragePath(url, supabaseUrl) && !extractCloudinaryPublicId(url, cloudName)
  );
  if (rejectedUrls.length > 0) {
    console.warn(`Rejected ${rejectedUrls.length} untrusted media URL(s) for article ${body.articleId}`);
  }

  let storageDeleted: unknown[] = [];
  if (storagePaths.length > 0) {
    const storageResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/${BUCKET}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "apikey": serviceRoleKey,
        },
        body: JSON.stringify({ prefixes: storagePaths }),
      },
    );
    const storageData = await storageResponse.json().catch(() => ({}));
    if (!storageResponse.ok) {
      console.error("Storage cleanup error:", storageData);
      return jsonResponse({ error: "Storage cleanup failed" }, 502);
    }
    storageDeleted = Array.isArray(storageData) ? storageData : [];
  }

  const cloudinaryDeleted: { publicId: string; result: string }[] = [];
  const cloudinaryErrors: { publicId: string; error: string }[] = [];
  for (const publicId of cloudinaryPublicIds) {
    try {
      cloudinaryDeleted.push(await deleteCloudinaryImage(publicId, cloudName, apiKey, apiSecret));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cloudinary cleanup failed";
      console.error(`Cloudinary cleanup error for ${publicId}:`, message);
      cloudinaryErrors.push({ publicId, error: message });
    }
  }

  return jsonResponse({
    articleId: body.articleId,
    event: body.event,
    storageDeleted,
    cloudinaryDeleted,
    cloudinaryErrors,
    rejectedUrlCount: rejectedUrls.length,
  }, 200);
});
