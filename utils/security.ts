
/**
 * Sanitizes user input to prevent XSS (Cross-Site Scripting) attacks.
 * Converts special characters to HTML entities.
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Validates if an image URL is potentially safe (basic check).
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  // Allow data URLs (base64) or http/https protocols
  return url.startsWith('http') || url.startsWith('data:image');
};
