import { useState, useEffect, useCallback } from "react";
import { Article } from "../types";
import apiService from "../services/apiService";

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

export const useArticles = () => {
  const [articles, setArticles] = useState<Article[]>(() => articleCache["all_1_20"] ?? []);
  const [loading, setLoading] = useState<boolean>(() => !articleCache["all_1_20"]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNews = useCallback(async (contentType: NonNullable<Article["contentType"]> | "all" = "all", pageParam: number = 1, limitParam: number = 20) => {
    const cacheKey = `${contentType}_${pageParam}_${limitParam}`;
    const cachedArticles = articleCache[cacheKey];
    if (cachedArticles) {
      setArticles(cachedArticles);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const result = await apiService.fetchArticles(contentType, pageParam, limitParam);
      const localNews = result.data;
      articleCache[cacheKey] = localNews;
      if (contentType === "all") {
        articleCache[`article_${pageParam}_${limitParam}`] = localNews.filter((article) => (article.contentType || "article") === "article");
      }
      setArticles(localNews);
      setTotalPages(Math.ceil(result.count / limitParam) || 1);
      setPage(pageParam);
      setLoading(false);
    } catch (err) {
      setError("ვერ მოხერხდა ახალი ამბების ჩატვირთვა.");
      const fallbackResult = await apiService.fetchArticles(contentType, pageParam, limitParam);
      articleCache[cacheKey] = fallbackResult.data;
      setArticles(fallbackResult.data);
      setTotalPages(Math.ceil(fallbackResult.count / limitParam) || 1);
      setPage(pageParam);
      setLoading(false);
    }
  }, []);

  const loadAllNews = useCallback((p: number = 1) => loadNews("all", p, 21), [loadNews]);
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
    };

    window.addEventListener("paqtebi-article-view-tracked", handleViewTracked);
    return () => {
      window.removeEventListener("paqtebi-article-view-tracked", handleViewTracked);
    };
  }, []);

  const refreshLocalOnly = async () => {
    const result = await apiService.fetchArticles("all", 1, 1000);
    const localNews = result.data;
    articleCache["all_1_20"] = localNews;
    articleCache["article_1_20"] = localNews.filter((article) => (article.contentType || "article") === "article");
    setArticles(localNews);
  };

  const addArticle = async (article: Article) => {
    try {
      const savedArticle = await apiService.insertArticle(article);
      if (!savedArticle) {
        throw new Error("Article was not saved");
      }
      await refreshLocalOnly();
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
    } catch (error) {
      console.error("Error updating article:", error);
      throw error;
    }
  };

  const removeArticle = async (id: string) => {
    await apiService.deleteArticle(id);
    await refreshLocalOnly();
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
