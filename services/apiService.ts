import RemoteApiService from "./remoteApiService";
import { AdInquiry, AdPlacement, Article, Comment, BreakingNewsItem, User } from "../types";

/**
 * Service class for handling all API/database operations
 * This service acts as a facade that uses RemoteApiService (Supabase/localStorage)
 * to maintain compatibility with existing code
 */
class ApiService {
  private articleCache = new Map<string, { data: Article[]; timestamp: number }>();
  private articleRequests = new Map<string, Promise<Article[]>>();
  private readonly ARTICLE_CACHE_TTL = 60_000;

  private clearArticleCache() {
    this.articleCache.clear();
    this.articleRequests.clear();
  }

  /**
   * Fetch all articles from storage
   */
  async fetchArticles(contentType: Article["contentType"] | "all" = "all"): Promise<Article[]> {
    const key = contentType || "all";
    const cached = this.articleCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ARTICLE_CACHE_TTL) {
      return cached.data;
    }

    const pending = this.articleRequests.get(key);
    if (pending) return pending;

    const request = RemoteApiService.fetchArticles(contentType)
      .then((data) => {
        const sanitizedData = data.map(article => {
          if (article.layout === 'hero' && article.imageUrl?.includes('picsum.photos')) {
            return { ...article, imageUrl: '' };
          }
          return article;
        });
        this.articleCache.set(key, { data: sanitizedData, timestamp: Date.now() });
        this.articleRequests.delete(key);
        return sanitizedData;
      })
      .catch((error) => {
        this.articleRequests.delete(key);
        throw error;
      });

    this.articleRequests.set(key, request);
    return request;
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
   * Add a reaction to a comment
   */
  async addReaction(id: string, reaction: string): Promise<boolean> {
    return RemoteApiService.addReaction(id, reaction);
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

  async fetchAdInquiries(): Promise<AdInquiry[]> {
    return RemoteApiService.fetchAdInquiries();
  }

  async insertAdInquiry(inquiry: Omit<AdInquiry, "id" | "createdAt">): Promise<AdInquiry | null> {
    return RemoteApiService.insertAdInquiry(inquiry);
  }
}

export default new ApiService();
