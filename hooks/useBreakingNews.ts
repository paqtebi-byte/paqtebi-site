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

  /**
   * Always fetches fresh data from Supabase, bypassing the session cache.
   * Called after insert/delete to immediately reflect DB state in the UI.
   */
  const fetchFresh = async () => {
    try {
      const fresh = await apiService.fetchBreakingNews();
      saveToCache(fresh);
      setBreakingNews(fresh);
    } catch (err) {
      console.error("[useBreakingNews] fetchFresh failed:", err);
    }
  };

  /**
   * Refreshes from cache when available; falls back to Supabase.
   * Used on initial mount to avoid unnecessary network calls.
   */
  const refreshTicker = async () => {
    const cached = getFromCache();
    if (cached) {
      setBreakingNews(cached);
      return;
    }
    await fetchFresh();
  };

  const addTickerItem = async (text: string) => {
    const result = await apiService.insertBreakingNews(text);
    if (!result) {
      throw new Error("Failed to insert breaking news item into Supabase.");
    }
    // Invalidate cache then force a fresh fetch so the UI reflects the new row immediately
    sessionStorage.removeItem(CACHE_KEY);
    await fetchFresh();
  };

  const removeTickerItem = async (id: string) => {
    const success = await apiService.deleteBreakingNews(id);
    if (!success) {
      throw new Error("Failed to delete breaking news item from Supabase.");
    }
    sessionStorage.removeItem(CACHE_KEY);
    await fetchFresh();
  };

  useEffect(() => {
    // On mount: use cached data if fresh, otherwise hit Supabase
    refreshTicker();
  }, []);

  return {
    breakingNews,
    addTickerItem,
    removeTickerItem,
    refreshTicker,
  };
};
