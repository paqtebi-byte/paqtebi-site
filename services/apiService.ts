import RemoteApiService from "./remoteApiService";
import { AdInquiry, AdPlacement, Article, Comment, BreakingNewsItem, User, AnalyticsData } from "../types";

/**
 * Service class for handling all API/database operations
 * This service acts as a facade that uses RemoteApiService (Supabase/localStorage)
 * to maintain compatibility with existing code
 */
class ApiService {
  private articleCache = new Map<string, { data: Article[]; count: number; timestamp: number }>();
  private articleRequests = new Map<string, Promise<{ data: Article[]; count: number }>>();
  private readonly ARTICLE_CACHE_TTL = 300_000; // 5 minutes

  private clearArticleCache() {
    this.articleCache.clear();
    this.articleRequests.clear();
  }

  /**
   * Fetch all articles from storage with pagination
   */
  async fetchArticles(contentType: Article["contentType"] | "all" = "all", page: number = 1, limit: number = 20): Promise<{ data: Article[], count: number }> {
    const key = `${contentType || "all"}_${page}_${limit}`;
    const cached = this.articleCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ARTICLE_CACHE_TTL) {
      return { data: cached.data, count: cached.count };
    }

    const pending = this.articleRequests.get(key);
    if (pending) return pending;

    const request = RemoteApiService.fetchArticles(contentType, page, limit)
      .then((result) => {
        const sanitizedData = result.data.map(article => {
          if (article.layout === 'hero' && article.imageUrl?.includes('picsum.photos')) {
            return { ...article, imageUrl: '' };
          }
          return article;
        });
        this.articleCache.set(key, { data: sanitizedData, count: result.count, timestamp: Date.now() });
        this.articleRequests.delete(key);
        return { data: sanitizedData, count: result.count };
      })
      .catch((error) => {
        this.articleRequests.delete(key);
        throw error;
      });

    this.articleRequests.set(key, request);
    return request;
  }

  /**
   * Fetch popular articles based on global view counts
   */
  async fetchPopularArticles(limit: number = 5): Promise<Article[]> {
    return RemoteApiService.fetchPopularArticles(limit);
  }

  /**
   * Fetch a single article by ID including full content body.
   * Used when navigating directly to /article/:id without cached navigation state.
   */
  async fetchArticleById(id: string): Promise<Article | null> {
    return RemoteApiService.fetchArticleById(id);
  }

  /**
   * Insert a new article
   */
  async insertArticle(article: Omit<Article, "id">): Promise<Article | null> {
    const saved = await RemoteApiService.insertArticle(article);
    this.clearArticleCache();
    return saved;
  }

  /**
   * Update an existing article
   */
  async updateArticle(
    id: string,
    article: Partial<Article>,
  ): Promise<Article | null> {
    const saved = await RemoteApiService.updateArticle(id, article);
    this.clearArticleCache();
    return saved;
  }

  /**
   * Delete an article by ID
   */
  async deleteArticle(id: string): Promise<boolean> {
    const deleted = await RemoteApiService.deleteArticle(id);
    this.clearArticleCache();
    return deleted;
  }

  /**
   * Fetch comments for an article or all comments
   */
  async fetchComments(articleId?: string): Promise<Comment[]> {
    return RemoteApiService.fetchComments(articleId);
  }

  /**
   * Insert a new comment
   */
  async insertComment(
    comment: Omit<Comment, "id" | "timestamp">,
  ): Promise<Comment | null> {
    return RemoteApiService.insertComment(comment);
  }

  /**
   * Delete a comment by ID
   */
  async deleteComment(id: string): Promise<boolean> {
    return RemoteApiService.deleteComment(id);
  }

  /**
   * Update a comment text by ID
   */
  async updateComment(id: string, text: string): Promise<Comment | null> {
    return RemoteApiService.updateComment(id, text);
  }

  /**
   * Add a reaction to a comment
   */
  async addReaction(id: string, reaction: string): Promise<boolean> {
    return RemoteApiService.addReaction(id, reaction);
  }

  async fetchAnalytics(): Promise<Pick<AnalyticsData, "totalArticles" | "totalViews">> {
    return RemoteApiService.fetchAnalytics();
  }

  async trackArticleView(articleId: string): Promise<number | null> {
    this.clearArticleCache();
    return RemoteApiService.trackArticleView(articleId);
  }

  /**
   * Fetch breaking news items
   */
  async fetchBreakingNews(): Promise<BreakingNewsItem[]> {
    return RemoteApiService.fetchBreakingNews();
  }

  /**
   * Insert a new breaking news item
   */
  async insertBreakingNews(text: string): Promise<BreakingNewsItem | null> {
    return RemoteApiService.insertBreakingNews(text);
  }

  /**
   * Delete a breaking news item
   */
  async deleteBreakingNews(id: string): Promise<boolean> {
    return RemoteApiService.deleteBreakingNews(id);
  }

  /**
   * Fetch registered users
   */
  async fetchUsers(): Promise<User[]> {
    return RemoteApiService.fetchUsers();
  }

  async fetchAdPlacement(): Promise<AdPlacement> {
    return RemoteApiService.fetchAdPlacement();
  }

  async saveAdPlacement(ad: AdPlacement): Promise<AdPlacement | null> {
    return RemoteApiService.saveAdPlacement(ad);
  }

  async clearAdPlacement(): Promise<boolean> {
    return RemoteApiService.clearAdPlacement();
  }

  async trackAdView(): Promise<void> {
    return RemoteApiService.trackAdView();
  }

  async fetchAdInquiries(): Promise<AdInquiry[]> {
    return RemoteApiService.fetchAdInquiries();
  }

  async insertAdInquiry(inquiry: Omit<AdInquiry, "id" | "createdAt">): Promise<AdInquiry | null> {
    return RemoteApiService.insertAdInquiry(inquiry);
  }
}

export default new ApiService();
