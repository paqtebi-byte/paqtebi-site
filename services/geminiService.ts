import { Article } from "../types";

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
    const response = await fetch("/api/gemini-summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: normalizedText }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return typeof data?.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : null;
  } catch {
    return null;
  }
};
