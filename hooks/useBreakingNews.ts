import { useState, useEffect } from "react";
import { BreakingNewsItem } from "../types";
import apiService from "../services/apiService";

export const useBreakingNews = () => {
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>([]);

  const refreshTicker = async () => {
    setBreakingNews(await apiService.fetchBreakingNews());
  };

  const addTickerItem = async (text: string) => {
    await apiService.insertBreakingNews(text);
    await refreshTicker();
  };

  const removeTickerItem = async (id: string) => {
    await apiService.deleteBreakingNews(id);
    await refreshTicker();
  };

  useEffect(() => {
    refreshTicker();
  }, []);

  return {
    breakingNews,
    addTickerItem,
    removeTickerItem,
    refreshTicker,
  };
};
