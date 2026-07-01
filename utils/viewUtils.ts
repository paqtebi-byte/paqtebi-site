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

    return events.reduce<Record<string, number>>((acc, event) => {
      if (event.timestamp >= cutoff) {
        acc[event.articleId] = (acc[event.articleId] || 0) + 1;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const getArticleViewCount = (articleId: string): number => {
  const views = getViewsForLastDay();
  // Using a hash on articleId to generate a fake "base" view count 
  // so articles don't show 0 views, just like MostReadWidget adds fallback views.
  const hash = articleId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseViews = (hash % 50) + 12; // Some number between 12 and 61
  
  return baseViews + (views[articleId] || 0);
};
