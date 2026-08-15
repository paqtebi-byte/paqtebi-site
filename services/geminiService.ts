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
 * Translates a Georgian article title to an English URL slug via the
 * server-side /api/translate-slug function. Also accepts an optional articleId
 * so the generated slug gets persisted to the DB for future visits.
 * Returns null on failure — caller falls back to UUID-only URL.
 */
export const translateTitleToSlug = async (title: string, articleId?: string): Promise<string | null> => {
  if (!title.trim()) return null;
  try {
    const response = await fetchWithTimeout("/api/translate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: title.trim(), ...(articleId ? { articleId } : {}) }),
    }, 12_000);

    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.slug === "string" && data.slug ? data.slug : null;
  } catch {
    return null;
  }
};




