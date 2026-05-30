import { useState, useEffect, useCallback } from "react";
import { Article } from "../types";
import apiService from "../services/apiService";

export const useArticles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const localNews = await apiService.fetchArticles("all");
      setArticles(localNews);
      setLoading(false);
    } catch (err) {
      setError("ვერ მოხერხდა ახალი ამბების ჩატვირთვა.");
      setArticles(await apiService.fetchArticles());
      setLoading(false);
    }
  }, []);

  const loadArticleNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const localNews = await apiService.fetchArticles("article");
      setArticles(localNews);
      setLoading(false);
    } catch (err) {
      setError("ვერ მოხერხდა ახალი ამბების ჩატვირთვა.");
      setArticles(await apiService.fetchArticles("article"));
      setLoading(false);
    }
  }, []);

  const refreshLocalOnly = async () => {
    setArticles(await apiService.fetchArticles());
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
    loadAllNews,
    loadArticleNews,
    refreshLocalOnly,
    addArticle,
    updateArticle,
    removeArticle,
  };
};
