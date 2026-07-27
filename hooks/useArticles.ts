import { useState, useEffect, useCallback } from "react";
import { Article } from "../types";
import apiService from "../services/apiService";
import { withSingleRetry } from "../utils/singleRetry";

type ArticleCacheKey = string; // e.g., "all_1_20"

const articleCache: Partial<Record<ArticleCacheKey, Article[]>> = {};

const applyViewCountUpdate = (
  articles: Article[],
  articleId: string,
  viewCount?: number,
) => articles.map((article) => {
  if (article.id !== articleId) return article;

  return {
    ...article,
    viewCount: Number.isFinite(Number(viewCount))
      ? Number(viewCount)
      : Number(article.viewCount || 0) + 1,
  };
});

/** Number of articles displayed in the main feed per page (excluding hero) */
const FEED_PAGE_SIZE = 20;

export const useArticles = () => {
  const [articles, setArticles] = useState<Article[]>(() => articleCache["all_1_20"] ?? []);
  const [adminArticles, setAdminArticles] = useState<Article[]>([]);
  const [heroArticle, setHeroArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !articleCache["all_1_20"]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNews = useCallback(async (contentType: NonNullable<Article["contentType"]> | "all" = "all", pageParam: number = 1, limitParam: number = FEED_PAGE_SIZE, heroId?: string, feedOnly: boolean = false) => {
    const cacheKey = `${contentType}_${pageParam}_${limitParam}_${heroId || ""}_${feedOnly ? "feed" : "all"}`;
    const cachedArticles = articleCache[cacheKey];
    if (cachedArticles) {
      setArticles(cachedArticles);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const result = await withSingleRetry(() => (
        apiService.fetchArticles(contentType, pageParam, limitParam, heroId, feedOnly)
      ));
      const localNews = result.data;
      articleCache[cacheKey] = localNews;
      if (contentType === "all") {
        articleCache[`article_${pageParam}_${limitParam}`] = localNews.filter((article) => (article.contentType || "article") === "article");
      }
      setArticles(localNews);
      setTotalPages(Math.ceil(result.count / limitParam) || 1);
      setPage(pageParam);
    } catch (err) {
      setError("ვერ მოხერხდა ახალი ამბების ჩატვირთვა.");
      console.error("Failed to fetch articles after retry", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load all news for the home page.
   * 1. Fetch hero article independently (autonomous, separate from feed)
   * 2. Fetch FEED_PAGE_SIZE feed articles, excluding the hero article's ID
   * This guarantees exactly FEED_PAGE_SIZE articles in the feed on every page.
   */
  const loadAllNews = useCallback(async (p: number = 1) => {
    // Step 1: Fetch hero article (autonomous, only once — stays the same across pages)
    let currentHeroId: string | undefined;
    try {
      const hero = await apiService.fetchHeroArticle();
      setHeroArticle(hero);
      currentHeroId = hero?.id;
    } catch {
      // Hero fetch failed — continue without hero, feed still loads
      console.error("Failed to fetch hero article");
    }

    // Step 2: Fetch feed articles, excluding the hero
    await loadNews("all", p, FEED_PAGE_SIZE, currentHeroId, true);
  }, [loadNews]);

  const loadArticleNews = useCallback((p: number = 1) => loadNews("article", p), [loadNews]);

  useEffect(() => {
    const handleViewTracked = (event: Event) => {
      const detail = (event as CustomEvent<{ articleId?: string; viewCount?: number }>).detail;
      const articleId = detail?.articleId;
      if (!articleId) return;

      Object.keys(articleCache).forEach((key) => {
        const cacheKey = key as ArticleCacheKey;
        const cachedArticles = articleCache[cacheKey];
        if (cachedArticles) {
          articleCache[cacheKey] = applyViewCountUpdate(cachedArticles, articleId, detail.viewCount);
        }
      });

      setArticles((currentArticles) => applyViewCountUpdate(currentArticles, articleId, detail.viewCount));

      // Also update hero if it matches
      setHeroArticle((currentHero) => {
        if (!currentHero || currentHero.id !== articleId) return currentHero;
        return {
          ...currentHero,
          viewCount: Number.isFinite(Number(detail.viewCount))
            ? Number(detail.viewCount)
            : Number(currentHero.viewCount || 0) + 1,
        };
      });
    };

    window.addEventListener("paqtebi-article-view-tracked", handleViewTracked);
    return () => {
      window.removeEventListener("paqtebi-article-view-tracked", handleViewTracked);
    };
  }, []);

  const refreshLocalOnly = async () => {
    const result = await apiService.fetchArticles("all", 1, 1000);
    const localNews = result.data;
    setAdminArticles(localNews);

    // Also refresh hero
    try {
      const hero = await apiService.fetchHeroArticle();
      setHeroArticle(hero);
    } catch {
      // ignore
    }
  };

  const addArticle = async (article: Article) => {
    try {
      const savedArticle = await apiService.insertArticle(article);
      if (!savedArticle) {
        throw new Error("Article was not saved");
      }
      await refreshLocalOnly();
      await loadAllNews(1);
    } catch (error) {
      console.error("Error adding article:", error);
      throw error;
    }
  };

  const updateArticle = async (id: string, article: Partial<Article>) => {
    try {
      const saved = await apiService.updateArticle(id, article);
      if (!saved) {
        throw new Error("Article was not updated");
      }
      await refreshLocalOnly();
      await loadAllNews(1);
    } catch (error) {
      console.error("Error updating article:", error);
      throw error;
    }
  };

  const removeArticle = async (id: string) => {
    await apiService.deleteArticle(id);
    await refreshLocalOnly();
    await loadAllNews(1);
  };

  // Initial Load
  useEffect(() => {
    // Note: We don't auto-load here because we might want to trigger it manually in App.tsx
    // to avoid double fetching if the component mounts twice.
    // But for a clean hook usage, usually we do:
    // loadAllNews();
  }, []);

  return {
    articles,
    adminArticles,
    heroArticle,
    loading,
    error,
    page,
    totalPages,
    loadAllNews,
    loadArticleNews,
    refreshLocalOnly,
    addArticle,
    updateArticle,
    removeArticle,
  };
};
