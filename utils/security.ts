import DOMPurify from 'dompurify';

/**
 * Sanitizes user input to prevent XSS (Cross-Site Scripting) attacks.
 * Converts special characters to HTML entities.
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  try {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  } catch (error) {
    // Fallback to basic sanitization if DOMPurify fails
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

/**
 * Validates if an image URL is potentially safe (basic check).
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  const value = url.trim();

  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
