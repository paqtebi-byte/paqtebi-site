import { Article } from "../types";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";

/**
 * The daily AI widget currently uses its editorial fallback article.
 * Keeping this function avoids changing the widget API while ensuring no
 * generative-AI credentials or SDK code are shipped to the browser.
 */
export const fetchAiFocusedNews = async (): Promise<Article[]> => [];

export const summarizeArticle = async (text: string): Promise<string | null> => {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (!normalizedText) return null;

  try {
    const response = await fetchWithTimeout("/api/gemini-summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: normalizedText }),
    }, 20_000);

    if (!response.ok) return null;

    const data = await response.json();
    return typeof data?.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : null;
  } catch {
    return null;
  }
};

/**
 * Converts a raw Gemini response into a safe, lowercase, hyphenated URL slug.
 */
function sanitiseSlug(raw: string): string | null {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || null;
}

/**
 * Translates a Georgian article title to an English URL slug using Gemini
 * directly from the browser (uses VITE_GEMINI_API_KEY which is already
 * client-side). Returns null if translation fails — caller falls back to
 * Georgian transliteration.
 */
export const translateTitleToSlug = async (title: string): Promise<string | null> => {
  if (!title.trim()) return null;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Translate this Georgian news headline to English and return ONLY a URL slug.\nRules: lowercase, words separated by hyphens, no special characters, max 70 chars.\nReturn the slug and nothing else — no explanation, no quotes.\n\nHeadline: ${title.trim()}`,
            }],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 60 },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const raw: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? "")
      .join("")
      .trim();
    return sanitiseSlug(raw);
  } catch {
    return null;
  }
};


