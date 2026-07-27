import crypto from "node:crypto";
import { getAdminSessionFromRequest } from "../server/adminSession.js";

const MAX_IMAGE_DATA_LENGTH = 8 * 1024 * 1024;

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

function signCloudinaryParams(params, apiSecret) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

async function uploadToCloudinary(imageData) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder: "paqtebi/articles",
    timestamp,
  };

  const formData = new FormData();
  formData.set("file", imageData);
  formData.set("api_key", apiKey);
  formData.set("folder", params.folder);
  formData.set("timestamp", String(timestamp));
  formData.set("signature", signCloudinaryParams(params, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message || `Cloudinary upload failed: ${response.status}`);
  }

  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
    width: data.width,
    height: data.height,
    bytes: data.bytes,
    format: data.format,
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, 405, { success: false, message: "Method not allowed" });
  }

  try {
    const body = await readBody(request);
    const admin = getAdminSessionFromRequest(request);
    if (!admin) {
      return json(response, 401, { success: false, message: "Admin session is invalid" });
    }

    const imageData = String(body.imageData || "");
    if (!imageData.startsWith("data:image/") || imageData.length > MAX_IMAGE_DATA_LENGTH) {
      return json(response, 400, { success: false, message: "Invalid or too large image" });
    }

    const uploaded = await uploadToCloudinary(imageData);
    return json(response, 200, { success: true, image: uploaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed";
    const status = message === "Cloudinary is not configured" ? 500 : 502;
    return json(response, status, { success: false, message });
  }
}
