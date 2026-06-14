const STORAGE_KEY_ADMIN_AUTH = "paqtebi_admin_auth";

export interface UploadedImage {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

export const uploadArticleImage = async (imageData: string): Promise<UploadedImage> => {
  const token = localStorage.getItem(STORAGE_KEY_ADMIN_AUTH);
  if (!token) {
    throw new Error("Admin session is missing");
  }

  const response = await fetch("/api/cloudinary-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageData, token }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false || !data?.image?.secureUrl) {
    throw new Error(data?.message || "Image upload failed");
  }

  return data.image as UploadedImage;
};
