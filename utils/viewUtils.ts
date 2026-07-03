import type { Article } from '../types';

export const VIEW_STORAGE_KEY = 'paqtebi_article_views';
export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface ViewEvent {
  articleId: string;
  timestamp: number;
}

export const getViewsForLastDay = (): Record<string, number> => {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    const events: ViewEvent[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - DAY_IN_MS;

    if (!Array.isArray(events)) return {};

    return events.reduce<Record<string, number>>((acc, event) => {
      if (event.articleId && Number(event.timestamp) >= cutoff) {
        acc[event.articleId] = (acc[event.articleId] || 0) + 1;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const getArticleViewCount = (articleOrId: Article | string): number => {
  if (typeof articleOrId !== 'string' && Number.isFinite(Number(articleOrId.viewCount))) {
    return Number(articleOrId.viewCount);
  }

  const articleId = typeof articleOrId === 'string' ? articleOrId : articleOrId.id;
  const views = getViewsForLastDay();
  return views[articleId] || 0;
};
