import { useState, useEffect, useCallback } from "react";
import { Article } from "../types";
import apiService from "../services/apiService";
import { withSingleRetry } from "../utils/singleRetry";

type ArticleCacheKey = string; // e.g., "all_1_20"

const articleCache: Partial<Record<ArticleCacheKey, Article[]>> = {};
let articleCacheVersion = 0;
let latestListRequestId = 0;

const HOME_PAGE_CACHE_KEY = "paqtebi_home_page_cache_v1";
const HOME_PAGE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ARTICLE_MUTATION_STORAGE_KEY = "paqtebi_article_mutation_v1";

type HomePageCache = {
  articles: Article[];
  heroArticle: Article | null;
  page: number;
  totalPages: number;
  savedAt: number;
};

const readHomePageCache = (): HomePageCache | null => {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(HOME_PAGE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<HomePageCache>;
    const cachedArticles = parsed.articles;
    const cachedAt = parsed.savedAt;
    const isValid =
      Array.isArray(cachedArticles) &&
      typeof cachedAt === "number" &&
      Date.now() - cachedAt < HOME_PAGE_CACHE_MAX_AGE_MS;

    if (!isValid) {
      sessionStorage.removeItem(HOME_PAGE_CACHE_KEY);
      return null;
    }

    return {
      articles: cachedArticles,
      heroArticle: parsed.heroArticle ?? null,
      page: Number(parsed.page || 1),
      totalPages: Math.max(1, Number(parsed.totalPages || 1)),
      savedAt: cachedAt,
    };
  } catch {
    sessionStorage.removeItem(HOME_PAGE_CACHE_KEY);
    return null;
  }
};

const writeHomePageCache = (cache: Omit<HomePageCache, "savedAt">) => {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(HOME_PAGE_CACHE_KEY, JSON.stringify({
      ...cache,
      savedAt: Date.now(),
    }));
  } catch {
    // Storage can be unavailable or full. Network loading still works normally.
  }
};

const invalidateArticleCache = () => {
  articleCacheVersion += 1;
  Object.keys(articleCache).forEach((key) => {
    delete articleCache[key];
  });
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(HOME_PAGE_CACHE_KEY);
  }
};

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

const applyViewCountSnapshot = (
  articles: Article[],
  viewCounts: Map<string, number>,
) => articles.map((article) => {
  const fetchedViewCount = viewCounts.get(article.id);
  if (fetchedViewCount === undefined) return article;

  return {
    ...article,
    // A view may be tracked while the background snapshot is in flight. Never
    // replace that newer local value with an older, smaller snapshot.
    viewCount: Math.max(Number(article.viewCount || 0), fetchedViewCount),
  };
});

/** Number of articles displayed in the main feed per page (excluding hero) */
const FEED_PAGE_SIZE = 20;

export const useArticles = () => {
  const [initialHomeCache] = useState<HomePageCache | null>(readHomePageCache);
  const [articles, setArticles] = useState<Article[]>(() => initialHomeCache?.articles ?? []);
  const [adminArticles, setAdminArticles] = useState<Article[]>([]);
  const [heroArticle, setHeroArticle] = useState<Article | null>(() => initialHomeCache?.heroArticle ?? null);
  const [loading, setLoading] = useState<boolean>(() => !initialHomeCache);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => initialHomeCache?.page ?? 1);
  const [totalPages, setTotalPages] = useState(() => initialHomeCache?.totalPages ?? 1);
  const [articleRevision, setArticleRevision] = useState(0);

  const hydrateVisibleViewCounts = useCallback((
    visibleArticles: Article[],
    visibleHero: Article | null,
    requestCacheVersion: number,
    listRequestId: number,
  ) => {
    const targetsById = new Map<string, Article>();
    visibleArticles.forEach((article) => targetsById.set(article.id, article));
    if (visibleHero) targetsById.set(visibleHero.id, visibleHero);
    if (targetsById.size === 0) return;

    void apiService.hydrateArticleViewCounts([...targetsById.values()])
      .then((hydratedArticles) => {
        if (
          requestCacheVersion !== articleCacheVersion ||
          listRequestId !== latestListRequestId
        ) return;

        const viewCounts = new Map(
          hydratedArticles.map((article) => [article.id, Number(article.viewCount || 0)]),
        );

        Object.keys(articleCache).forEach((key) => {
          const cacheKey = key as ArticleCacheKey;
          const cachedArticles = articleCache[cacheKey];
          if (cachedArticles) {
            articleCache[cacheKey] = applyViewCountSnapshot(cachedArticles, viewCounts);
          }
        });

        setArticles((currentArticles) => applyViewCountSnapshot(currentArticles, viewCounts));
        setHeroArticle((currentHero) => {
          if (!currentHero) return currentHero;
          return applyViewCountSnapshot([currentHero], viewCounts)[0];
        });

        const cachedHome = readHomePageCache();
        if (cachedHome?.page === 1) {
          writeHomePageCache({
            articles: applyViewCountSnapshot(cachedHome.articles, viewCounts),
            heroArticle: cachedHome.heroArticle
              ? applyViewCountSnapshot([cachedHome.heroArticle], viewCounts)[0]
              : null,
            page: cachedHome.page,
            totalPages: cachedHome.totalPages,
          });
        }
      })
      .catch((error) => {
        console.error("Background article view count refresh failed", error);
      });
  }, []);

  const loadNews = useCallback(async (
    contentType: NonNullable<Article["contentType"]> | "all" = "all",
    pageParam: number = 1,
    limitParam: number = FEED_PAGE_SIZE,
    heroId?: string,
    feedOnly: boolean = false,
    showLoading: boolean = true,
    preserveVisibleArticlesOnEmpty: boolean = false,
    category?: string,
  ) => {
    const requestCacheVersion = articleCacheVersion;
    const listRequestId = ++latestListRequestId;
    const cacheKey = `${contentType}_${pageParam}_${limitParam}_${heroId || ""}_${feedOnly ? "feed" : "all"}_${category || "all-categories"}`;
    const cachedArticles = articleCache[cacheKey];
    if (cachedArticles) {
      setArticles(cachedArticles);
      if (showLoading) setLoading(false);
    } else if (showLoading) {
      setLoading(true);
    }

    setError(null);
    try {
      const result = await withSingleRetry(() => (
        apiService.fetchArticles(contentType, pageParam, limitParam, heroId, feedOnly, category)
      ));
      const localNews = result.data;
      if (
        requestCacheVersion !== articleCacheVersion ||
        listRequestId !== latestListRequestId
      ) return;

      if (preserveVisibleArticlesOnEmpty && localNews.length === 0) {
        return result;
      }

      articleCache[cacheKey] = localNews;
      if (contentType === "all") {
        articleCache[`article_${pageParam}_${limitParam}`] = localNews.filter((article) => (article.contentType || "article") === "article");
      }
      setArticles(localNews);
      setTotalPages(Math.ceil(result.count / limitParam) || 1);
      setPage(pageParam);
      return result;
    } catch (err) {
      if (!showLoading) {
        console.error("Background article refresh failed", err);
        return null;
      }
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
    const requestCacheVersion = articleCacheVersion;
    const cachedHome = p === 1 ? readHomePageCache() : null;

    if (cachedHome) {
      setArticles(cachedHome.articles);
      setHeroArticle(cachedHome.heroArticle);
      setPage(cachedHome.page);
      setTotalPages(cachedHome.totalPages);
      setLoading(false);
      setError(null);
    }

    if (cachedHome?.heroArticle?.id) {
      // Keep cached content visible while hero and feed revalidate in parallel.
      const [freshHero, firstFeedResult] = await Promise.all([
        apiService.fetchHeroArticle().catch(() => cachedHome.heroArticle),
        loadNews("all", p, FEED_PAGE_SIZE, cachedHome.heroArticle.id, true, false, true),
      ]);

      if (requestCacheVersion !== articleCacheVersion) return;

      const resolvedHero = freshHero ?? cachedHome.heroArticle;
      let feedResult = firstFeedResult;
      if (resolvedHero.id !== cachedHome.heroArticle.id) {
        // Preserve the exact 20-item pagination contract if the hero changed.
        feedResult = await loadNews("all", p, FEED_PAGE_SIZE, resolvedHero.id, true, false, true);
      }

      if (requestCacheVersion !== articleCacheVersion) return;
      setHeroArticle(resolvedHero);

      if (feedResult?.data.length) {
        writeHomePageCache({
          articles: feedResult.data,
          heroArticle: resolvedHero,
          page: p,
          totalPages: Math.ceil(feedResult.count / FEED_PAGE_SIZE) || 1,
        });
      }
      return;
    }
    // Step 1: Fetch hero article (autonomous, only once — stays the same across pages)
    if (p === 1) {
      const listRequestId = ++latestListRequestId;
      if (!cachedHome) setLoading(true);
      setError(null);

      try {
        // On a cold visit, hero and feed are independent database queries. Run
        // them together and defer analytics so useful content can paint first.
        const [loadedHero, unfilteredFeedResult] = await Promise.all([
          withSingleRetry(() => apiService.fetchHeroArticle(false)).catch(() => {
            console.error("Failed to fetch hero article");
            return null;
          }),
          withSingleRetry(() => apiService.fetchArticles(
            "all",
            1,
            FEED_PAGE_SIZE + 1,
            undefined,
            true,
            undefined,
            false,
          )),
        ]);

        if (
          requestCacheVersion !== articleCacheVersion ||
          listRequestId !== latestListRequestId
        ) return;

        // A dedicated layout='hero' row is not in the standard feed. The extra
        // row still preserves 20 items if the hero query falls back to the
        // newest standard article because no explicit hero exists.
        const heroId = loadedHero?.id;
        const heroWasInPrimaryFeed = Boolean(heroId && unfilteredFeedResult.data.some(
          (article) => article.id === heroId && !(article as any)._isSupplementary,
        ));
        const primaryArticles = unfilteredFeedResult.data
          .filter((article) => !(article as any)._isSupplementary && article.id !== heroId)
          .slice(0, FEED_PAGE_SIZE);
        const supplementaryArticles = unfilteredFeedResult.data.filter(
          (article) => (article as any)._isSupplementary && article.id !== heroId,
        );
        const localNews = [...primaryArticles, ...supplementaryArticles];
        const feedCount = Math.max(
          0,
          unfilteredFeedResult.count - (heroWasInPrimaryFeed ? 1 : 0),
        );
        const resolvedTotalPages = Math.ceil(feedCount / FEED_PAGE_SIZE) || 1;
        const cacheKey = `all_1_${FEED_PAGE_SIZE}_${heroId || ""}_feed_all-categories`;

        articleCache[cacheKey] = localNews;
        articleCache[`article_1_${FEED_PAGE_SIZE}`] = localNews.filter(
          (article) => (article.contentType || "article") === "article",
        );
        setArticles(localNews);
        setHeroArticle(loadedHero);
        setTotalPages(resolvedTotalPages);
        setPage(1);

        if (localNews.length) {
          writeHomePageCache({
            articles: localNews,
            heroArticle: loadedHero,
            page: 1,
            totalPages: resolvedTotalPages,
          });
        }

        hydrateVisibleViewCounts(
          localNews,
          loadedHero,
          requestCacheVersion,
          listRequestId,
        );
        return;
      } catch (error) {
        if (!cachedHome) {
          setError("ვერ მოხერხდა ახალი ამბების ჩატვირთვა.");
        }
        console.error("Failed to load the initial home page after retry", error);
        return;
      } finally {
        if (
          requestCacheVersion === articleCacheVersion &&
          listRequestId === latestListRequestId
        ) {
          setLoading(false);
        }
      }
    }

    let currentHeroId: string | undefined;
    let loadedHero: Article | null = null;
    try {
      const hero = await apiService.fetchHeroArticle();
      if (requestCacheVersion !== articleCacheVersion) return;

      loadedHero = hero;
      setHeroArticle(hero);
      currentHeroId = hero?.id;
    } catch {
      // Hero fetch failed — continue without hero, feed still loads
      console.error("Failed to fetch hero article");
    }

    // Step 2: Fetch feed articles, excluding the hero
    const feedResult = await loadNews("all", p, FEED_PAGE_SIZE, currentHeroId, true);
    if (p === 1 && feedResult?.data.length) {
      writeHomePageCache({
        articles: feedResult.data,
        heroArticle: loadedHero,
        page: p,
        totalPages: Math.ceil(feedResult.count / FEED_PAGE_SIZE) || 1,
      });
    }
  }, [hydrateVisibleViewCounts, loadNews]);

  const loadArticleNews = useCallback((p: number = 1) => loadNews("article", p), [loadNews]);
  const loadCategoryNews = useCallback(
    (category: string, p: number = 1) => loadNews(
      "all",
      p,
      FEED_PAGE_SIZE,
      undefined,
      true,
      true,
      false,
      category,
    ),
    [loadNews],
  );

  // Article lists are cached per browser tab. When an administrator saves in
  // another tab, invalidate this tab too so both the feed and an already-open
  // article detail page can immediately request the saved version.
  useEffect(() => {
    const handleArticleMutation = (event: StorageEvent) => {
      if (event.key !== ARTICLE_MUTATION_STORAGE_KEY || !event.newValue) return;

      apiService.invalidateArticleCache();
      invalidateArticleCache();
      setArticleRevision((revision) => revision + 1);
      void loadAllNews(1);
    };

    window.addEventListener("storage", handleArticleMutation);
    return () => window.removeEventListener("storage", handleArticleMutation);
  }, [loadAllNews]);

  const announceArticleMutation = (id: string) => {
    setArticleRevision((revision) => revision + 1);
    try {
      localStorage.setItem(ARTICLE_MUTATION_STORAGE_KEY, JSON.stringify({
        id,
        timestamp: Date.now(),
      }));
    } catch {
      // Cross-tab refresh is best-effort; the current tab is already refreshed.
    }
  };

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
      invalidateArticleCache();
      announceArticleMutation(savedArticle.id);
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
      invalidateArticleCache();
      announceArticleMutation(id);
      await refreshLocalOnly();
      await loadAllNews(1);
    } catch (error) {
      console.error("Error updating article:", error);
      throw error;
    }
  };

  const removeArticle = async (id: string) => {
    await apiService.deleteArticle(id);
    invalidateArticleCache();
    announceArticleMutation(id);
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
    articleRevision,
    loadAllNews,
    loadArticleNews,
    loadCategoryNews,
    refreshLocalOnly,
    addArticle,
    updateArticle,
    removeArticle,
  };
};
