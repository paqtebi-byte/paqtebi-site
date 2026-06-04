import { useState, useEffect } from "react";
import { BreakingNewsItem } from "../types";
import apiService from "../services/apiService";

const CACHE_KEY = "paqtebi_breaking_news_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getFromCache = (): BreakingNewsItem[] | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

const saveToCache = (data: BreakingNewsItem[]) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
};

export const useBreakingNews = () => {
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>(() => getFromCache() ?? []);

  const refreshTicker = async () => {
    const cached = getFromCache();
    if (cached) { setBreakingNews(cached); return; }
    const fresh = await apiService.fetchBreakingNews();
    saveToCache(fresh);
    setBreakingNews(fresh);
  };

  const addTickerItem = async (text: string) => {
    await apiService.insertBreakingNews(text);
    sessionStorage.removeItem(CACHE_KEY);
    await refreshTicker();
  };

  const removeTickerItem = async (id: string) => {
    await apiService.deleteBreakingNews(id);
    sessionStorage.removeItem(CACHE_KEY);
    await refreshTicker();
  };

  useEffect(() => {
    if (!getFromCache()) refreshTicker();
  }, []);

  return {
    breakingNews,
    addTickerItem,
    removeTickerItem,
    refreshTicker,
  };
};
