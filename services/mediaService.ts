import { fetchWithTimeout } from "../utils/fetchWithTimeout";

export interface UploadedImage {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

export const uploadArticleImage = async (imageData: string): Promise<UploadedImage> => {
  const response = await fetchWithTimeout("/api/cloudinary-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ imageData }),
  }, 45_000);

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false || !data?.image?.secureUrl) {
    throw new Error(data?.message || "Image upload failed");
  }

  return data.image as UploadedImage;
};
