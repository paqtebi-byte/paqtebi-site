import type { SupabaseClient } from "@supabase/supabase-js";
import { AdInquiry, AdPlacement, Article, Comment, BreakingNewsItem, User, AnalyticsData } from "../types";
import { DATABASE_CONFIG } from "../config/database";
import getSupabaseClient from "./supabaseClient";

/**
 * Service class for handling all API/database operations with Supabase
 */
class RemoteApiService {
  private supabase: SupabaseClient | null = null;
  private readonly LOCAL_STORAGE_KEY = "paqtebi_articles";
  private readonly COMMENT_STORAGE_KEY = "paqtebi_comments";
  private readonly BREAKING_NEWS_STORAGE_KEY = "paqtebi_breaking_news";
  private readonly USER_STORAGE_KEY = "paqtebi_users";
  private readonly AD_STORAGE_KEY = "paqtebi_ad_placement";
  private readonly AD_INQUIRIES_STORAGE_KEY = "paqtebi_ad_inquiries";
  private readonly VIEW_STORAGE_KEY = "paqtebi_article_views";
  private readonly VIEW_EVENT_AUTHOR = "__paqtebi_view__";

  constructor() {
    if (!DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      this.supabase = getSupabaseClient();
    }
  }

  private mapArticleFromDb(row: any): Article {
    return {
      ...row,
      imageUrl: row.imageUrl ?? row.image_url ?? "",
      contentType: row.contentType ?? row.content_type ?? "article",
      videoUrl: row.videoUrl ?? row.video_url ?? "",
      videoProvider: row.videoProvider ?? row.video_provider ?? undefined,
      videoId: row.videoId ?? row.video_id ?? undefined,
      videoThumbnailUrl: row.videoThumbnailUrl ?? row.video_thumbnail_url ?? undefined,
      videoDuration: row.videoDuration ?? row.video_duration ?? undefined,
      isLive: row.isLive ?? row.is_live ?? false,
      liveStatus: row.liveStatus ?? row.live_status ?? undefined,
      scheduledAt: row.scheduledAt ?? row.scheduled_at ?? undefined,
      viewCount: Number(row.viewCount ?? row.view_count ?? 0),
    } as Article;
  }

  private mapArticleToDb(article: Partial<Article>): Record<string, any> {
    const {
      // camelCase fields that need snake_case mapping
      imageUrl,
      contentType,
      videoUrl,
      videoProvider,
      videoId,
      videoThumbnailUrl,
      videoDuration,
      isLive,
      liveStatus,
      scheduledAt,
      // Filter out raw DB fields that might have leaked into the object
      image_url,
      content_type,
      video_url,
      video_provider,
      video_id,
      video_thumbnail_url,
      video_duration,
      is_live,
      live_status,
      scheduled_at,
      created_at,
      // id is always stripped — Supabase generates it on insert, passed via .eq() on update
      id: _id,
      // Strip client-only computed fields that don't exist in the DB
      viewCount: _viewCount,
      view_count: _view_count,
      _isSupplementary,
      // rest: title, summary, content, author, category, category_slug, date, layout — stay as-is
      ...rest
    } = article as any;

    const payload: Record<string, any> = {
      ...rest,
      imageUrl: imageUrl, // store in imageUrl column instead of image_url
      content_type: contentType,
      video_url: videoUrl,
      video_provider: videoProvider,
      video_id: videoId,
      video_thumbnail_url: videoThumbnailUrl,
      video_duration: videoDuration,
      is_live: isLive,
      live_status: liveStatus,
      scheduled_at: scheduledAt,
    };

    // Strip any undefined values
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    return payload;
  }

  private getLocalAdPlacement(): AdPlacement {
    const stored = localStorage.getItem(this.AD_STORAGE_KEY);
    return stored
      ? JSON.parse(stored)
      : { title: "", imageUrl: "", targetUrl: "", active: false, views: 0 };
  }

  private saveLocalAdPlacement(ad: AdPlacement): AdPlacement {
    const saved = { ...ad, updatedAt: new Date().toISOString() };
    localStorage.setItem(this.AD_STORAGE_KEY, JSON.stringify(saved));
    return saved;
  }

  private mapAdFromDb(row: any): AdPlacement {
    return {
      title: row?.title || "",
      imageUrl: row?.image_url || "",
      targetUrl: row?.target_url || "",
      active: Boolean(row?.active),
      updatedAt: row?.updated_at,
    };
  }

  private mapAdInquiryFromDb(row: any): AdInquiry {
    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      message: row.message ?? "",
      createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    };
  }

  private mapCommentFromDb(row: any, articleTitle?: string): Comment {
    const createdAt = row.created_at ? Date.parse(row.created_at) : Date.now();

    return {
      id: row.id,
      articleId: row.article_id,
      author: row.author,
      text: row.text,
      timestamp: Number(row.timestamp ?? createdAt),
      reactions: row.reactions ?? {},
      articleTitle,
    };
  }

  private isAnalyticsCommentRow(row: any): boolean {
    return row?.author === this.VIEW_EVENT_AUTHOR || String(row?.text || "").startsWith("[[paqtebi-view:");
  }

  private async fetchCommentsFromApi(articleId?: string): Promise<Comment[]> {
    const query = articleId ? `?articleId=${encodeURIComponent(articleId)}` : "";
    const response = await fetch(`/api/comments${query}`);
    if (!response.ok) {
      throw new Error(`Comment API failed: ${response.status}`);
    }
    const data = await response.json();
    return data.comments || [];
  }

  private async insertCommentViaApi(
    comment: Omit<Comment, "id" | "timestamp">,
  ): Promise<Comment | null> {
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        articleId: comment.articleId,
        author: comment.author,
        text: comment.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Comment API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.comment || null;
  }

  private async deleteCommentViaApi(id: string): Promise<boolean> {
    const response = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Comment API failed: ${response.status}`);
    }

    return true;
  }

  private getLocalViewEvents(): { articleId: string; timestamp: number }[] {
    try {
      const stored = localStorage.getItem(this.VIEW_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private recordLocalArticleView(articleId: string) {
    try {
      const events = this.getLocalViewEvents();
      const nextEvents = [...events, { articleId, timestamp: Date.now() }].slice(-5000);
      localStorage.setItem(this.VIEW_STORAGE_KEY, JSON.stringify(nextEvents));
    } catch {
      // Local view history is best-effort only.
    }
  }

  private getLocalArticleViewCounts(articleIds: string[] = []): Record<string, number> {
    const requestedIds = new Set(articleIds);
    return this.getLocalViewEvents().reduce<Record<string, number>>((counts, event) => {
      if (!event.articleId || (requestedIds.size > 0 && !requestedIds.has(event.articleId))) {
        return counts;
      }

      counts[event.articleId] = (counts[event.articleId] || 0) + 1;
      return counts;
    }, {});
  }

  private async fetchArticleViewCounts(articleIds: string[]): Promise<Record<string, number>> {
    if (articleIds.length === 0) return {};

    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      return this.getLocalArticleViewCounts(articleIds);
    }

    try {
      const response = await fetch(`/api/analytics?articleIds=${encodeURIComponent(articleIds.join(","))}`);
      if (!response.ok) throw new Error(`Analytics API failed: ${response.status}`);

      const data = await response.json();
      return data.viewCounts || {};
    } catch (error) {
      console.warn("Article view count fetch failed; using local fallback:", error);
      return this.getLocalArticleViewCounts(articleIds);
    }
  }

  private async attachArticleViewCounts(articles: Article[]): Promise<Article[]> {
    const articleIds = articles.map((article) => article.id).filter(Boolean);
    const viewCounts = await this.fetchArticleViewCounts(articleIds);

    return articles.map((article) => ({
      ...article,
      viewCount: Number(viewCounts[article.id] || 0),
    }));
  }

  async fetchAnalytics(): Promise<Pick<AnalyticsData, "totalArticles" | "totalViews">> {
    try {
      const response = await fetch("/api/analytics");
      if (!response.ok) throw new Error(`Analytics API failed: ${response.status}`);

      const data = await response.json();
      return {
        totalArticles: Number(data.totalArticles || 0),
        totalViews: Number(data.totalViews || 0),
      };
    } catch (error) {
      console.warn("Analytics API failed; using local fallback:", error);
      const fetchResult = await this.fetchArticles();
      const articles = fetchResult.data;
      return {
        totalArticles: articles.length,
        totalViews: this.getLocalViewEvents().length,
      };
    }
  }

  async trackArticleView(articleId: string): Promise<number | null> {
    if (!articleId) return null;

    if (typeof sessionStorage !== "undefined") {
      const recentKey = `paqtebi_recent_view_${articleId}`;
      const lastTrackedAt = Number(sessionStorage.getItem(recentKey) || 0);
      const now = Date.now();
      if (now - lastTrackedAt < 1500) {
        return null;
      }
      sessionStorage.setItem(recentKey, String(now));
    }

    this.recordLocalArticleView(articleId);
    const notifyViewTracked = (viewCount?: number) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("paqtebi-article-view-tracked", {
          detail: { articleId, viewCount },
        }));
      }
    };

    try {
      const response = await fetch("/api/analytics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "view", articleId }),
      });

      if (!response.ok) {
        throw new Error(`Analytics API failed: ${response.status}`);
      }
      const data = await response.json();
      const viewCount = Number.isFinite(Number(data.viewCount)) ? Number(data.viewCount) : null;
      notifyViewTracked(viewCount ?? undefined);
      return viewCount;
    } catch (error) {
      console.warn("Article view tracking failed:", error);
      notifyViewTracked();
      return null;
    }
  }

  private getLocalAdInquiries(): AdInquiry[] {
    const stored = localStorage.getItem(this.AD_INQUIRIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Fetch all articles from the database with pagination
   */
  async fetchArticles(contentType: Article["contentType"] | "all" = "all", page: number = 1, limit: number = 20): Promise<{ data: Article[], count: number }> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
        const articles = stored ? JSON.parse(stored) : [];
        const filteredArticles = contentType === "all"
          ? articles
          : articles.filter((article: Article) => (article.contentType || "article") === contentType);
        const withViews = await this.attachArticleViewCounts(filteredArticles);
        const start = (page - 1) * limit;
        return { data: withViews.slice(start, start + limit), count: withViews.length };
      } catch (error) {
        console.error("Error fetching articles from localStorage:", error);
        return { data: [], count: 0 };
      }
    }

    try {
      const fromRow = (page - 1) * limit;
      const toRow = fromRow + limit - 1;

      let mainQuery = this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .select(
          "id, title, summary, author, category, category_slug, date, layout, imageUrl, content_type, video_url, video_provider, video_id, video_thumbnail_url, video_duration, is_live, live_status, scheduled_at, created_at, is_archived",
          { count: "exact" }
        )
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .range(fromRow, toRow);

      if (contentType !== "all") {
        mainQuery = mainQuery.eq("content_type", contentType);
      }

      let sidebarQuery: any = null;
      if (contentType === "all") {
        sidebarQuery = this.supabase!
          .from(DATABASE_CONFIG.TABLES.ARTICLES)
          .select(
            "id, title, summary, author, category, category_slug, date, layout, imageUrl, content_type, video_url, video_provider, video_id, video_thumbnail_url, video_duration, is_live, live_status, scheduled_at, created_at, is_archived"
          )
          .eq("is_archived", false)
          .in("category", ["ვიდეო რეპორტაჟები", "პოდკასტები", "საინტერესო"])
          .order("created_at", { ascending: false })
          .limit(15);
      }

      const [mainResult, sidebarResult] = await Promise.all([
        mainQuery,
        sidebarQuery ? sidebarQuery : Promise.resolve({ data: null, error: null })
      ]);

      if (mainResult.error) {
        throw new Error(`Error fetching articles: ${mainResult.error.message}`);
      }

      // Map main articles first — these are the primary feed articles and must stay intact
      const mainRows = (mainResult.data || []);
      const mainArticles = mainRows.map((row: any) => this.mapArticleFromDb(row));
      
      // Collect IDs of main articles to avoid duplicating them from sidebar
      const mainIdSet = new Set(mainRows.map((r: any) => r.id));
      
      // Sidebar articles: only add those that are NOT already in the main set
      const sidebarRows = (sidebarResult.data || []);
      const supplementaryArticles = sidebarRows
        .filter((row: any) => !mainIdSet.has(row.id))
        .map((row: any) => {
          const article = this.mapArticleFromDb(row);
          (article as any)._isSupplementary = true;
          return article;
        });
      
      // Main articles come first (preserving their exact count), then supplementary
      const combined = [...mainArticles, ...supplementaryArticles];

      return {
        data: await this.attachArticleViewCounts(combined),
        count: mainResult.count || 0
      };
    } catch (error) {
      console.error("Error in fetchArticles:", error);
      return { data: [], count: 0 };
    }
  }

  /**
   * Fetch top N popular articles based on global view counts.
   */
  async fetchPopularArticles(limit: number = 5): Promise<Article[]> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      const fetchResult = await this.fetchArticles("all", 1, 100);
      return fetchResult.data
        .sort((a, b) => Number(b.viewCount || 0) - Number(a.viewCount || 0))
        .slice(0, limit);
    }

    try {
      const response = await fetch('/api/analytics?scope=articleCounts');
      if (!response.ok) throw new Error('Analytics API failed');
      const data = await response.json();
      const viewCounts: Record<string, number> = data.viewCounts || {};

      const sortedIds = Object.keys(viewCounts)
        .sort((a, b) => viewCounts[b] - viewCounts[a])
        .slice(0, limit);

      if (sortedIds.length === 0) return [];

      const { data: articles, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .select("id, title, summary, author, category, category_slug, date, layout, imageUrl, content_type, video_url, video_provider, video_id, video_thumbnail_url, video_duration, is_live, live_status, scheduled_at, created_at, is_archived")
        .in('id', sortedIds)
        .eq("is_archived", false);

      if (error) throw error;

      const mapped = (articles || []).map(row => this.mapArticleFromDb(row));
      return mapped
        .map(a => ({ ...a, viewCount: viewCounts[a.id] }))
        .sort((a, b) => Number(b.viewCount) - Number(a.viewCount));
    } catch (error) {
      console.error("Error in fetchPopularArticles:", error);
      return [];
    }
  }

  /**
   * Fetch a single article by ID including its full content body.
   * Called only when opening an article detail page by direct URL (no navigation state).
   */
  async fetchArticleById(id: string): Promise<Article | null> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      const fetchResult = await this.fetchArticles();
      const articles = fetchResult.data;
      return articles.find((a) => a.id === id) ?? null;
    }

    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .select(
          "id, title, summary, content, author, category, category_slug, date, layout, imageUrl, content_type, video_url, video_provider, video_id, video_thumbnail_url, video_duration, is_live, live_status, scheduled_at, created_at, is_archived"
        )
        .eq("id", id)
        .eq("is_archived", false)
        .maybeSingle();

      if (error) throw new Error(`Error fetching article: ${error.message}`);
      if (!data) return null;
      const [article] = await this.attachArticleViewCounts([this.mapArticleFromDb(data)]);
      return article;
    } catch (error) {
      console.error("Error in fetchArticleById:", error);
      return null;
    }
  }

  /**
   * Insert a new article into the database
   */
  async insertArticle(article: Omit<Article, "id">): Promise<Article | null> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const fetchResult = await this.fetchArticles();
        const articles = fetchResult.data;
        const newArticle = {
          ...article,
          id: Date.now().toString(),
        } as Article;

        const existingIndex = articles.findIndex((a) => a.id === newArticle.id);
        if (existingIndex >= 0) {
          articles[existingIndex] = newArticle;
        } else {
          articles.unshift(newArticle);
        }
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(articles));
        return newArticle;
      } catch (error) {
        console.error("Error inserting article to localStorage:", error);
        return null;
      }
    }

    // Use Supabase — `id` is deleted in mapArticleToDb, so Supabase auto-generates a UUID
    try {
      const payload = {
        ...this.mapArticleToDb(article as Partial<Article>),
        created_at: article.layout === 'hero' 
          ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() 
          : new Date().toISOString(),
      };

      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .insert([payload])
        .select("id, title, summary, author, category, category_slug, date, layout, imageUrl, content_type, video_url, video_provider, video_id, video_thumbnail_url, video_duration, is_live, live_status, scheduled_at, created_at, is_archived")
        .single();

      if (error) {
        throw new Error(`Error inserting article: ${error.message}`);
      }

      return this.mapArticleFromDb(data);
    } catch (error) {
      console.error("Error in insertArticle:", error);
      return null;
    }
  }

  /**
   * Update an existing article
   */
  async updateArticle(
    id: string,
    article: Partial<Article>,
  ): Promise<Article | null> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const fetchResult = await this.fetchArticles();
        const articles = fetchResult.data;
        const index = articles.findIndex((a) => a.id === id);

        if (index === -1) {
          return null;
        }

        articles[index] = { ...articles[index], ...article } as Article;
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(articles));
        return articles[index];
      } catch (error) {
        console.error("Error updating article in localStorage:", error);
        return null;
      }
    }

    // Use Supabase — `id` is deleted in mapArticleToDb, passed only in .eq()
    try {
      const updatePayload = this.mapArticleToDb(article);
      if (article.layout === 'hero') {
        updatePayload.created_at = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .update(updatePayload)
        .eq("id", id)
        .select("id, title, summary, author, category, category_slug, date, layout, imageUrl, content_type, video_url, video_provider, video_id, video_thumbnail_url, video_duration, is_live, live_status, scheduled_at, created_at, is_archived")
        .single();

      if (error) {
        throw new Error(`Error updating article: ${error.message}`);
      }

      return this.mapArticleFromDb(data);
    } catch (error) {
      console.error("Error in updateArticle:", error);
      return null;
    }
  }

  /**
   * Delete an article by ID
   */
  async deleteArticle(id: string): Promise<boolean> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const fetchResult = await this.fetchArticles();
        const articles = fetchResult.data;
        const filtered = articles.filter((a) => a.id !== id);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(filtered));
        return true;
      } catch (error) {
        console.error("Error deleting article from localStorage:", error);
        return false;
      }
    }

    // Use Supabase
    try {
      const { error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(`Error deleting article: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error in deleteArticle:", error);
      return false;
    }
  }

  /**
   * Fetch comments for an article or all comments
   */
  async fetchComments(articleId?: string): Promise<Comment[]> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const stored = localStorage.getItem(this.COMMENT_STORAGE_KEY);
        let comments: Comment[] = stored ? JSON.parse(stored) : [];
        comments = comments.filter((comment) => comment.author !== this.VIEW_EVENT_AUTHOR);

        if (articleId) {
          comments = comments.filter((c) => c.articleId === articleId);
        }

        const fetchResult = await this.fetchArticles();
        const articles = fetchResult.data;
        comments = comments.map((comment) => {
          const article = articles.find((a) => a.id === comment.articleId);
          return {
            ...comment,
            articleTitle: article ? article.title : undefined,
          };
        });

        return comments;
      } catch (error) {
        console.error("Error fetching comments from localStorage:", error);
        return [];
      }
    }

    try {
      return await this.fetchCommentsFromApi(articleId);
    } catch (apiError) {
      console.warn("Comment API fetch failed; falling back to Supabase client:", apiError);
    }

    // Use Supabase as a fallback. Keep this query independent from FK relationship
    // names so comments still load when the database relation is named differently.
    try {
      let query = this.supabase!
        .from(DATABASE_CONFIG.TABLES.COMMENTS)
        .select("id, article_id, author, text, created_at")
        .order("created_at", { ascending: false })
        .range(0, 49);

      if (articleId) {
        query = query.eq("article_id", articleId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching comments: ${error.message}`);
      }

      const rows = (data || []).filter((row: any) => !this.isAnalyticsCommentRow(row));
      const articleIds = [...new Set(rows.map((row: any) => row.article_id).filter(Boolean))];
      const titleByArticleId = new Map<string, string>();

      if (articleIds.length > 0) {
        const { data: articleRows, error: articleError } = await this.supabase!
          .from(DATABASE_CONFIG.TABLES.ARTICLES)
          .select("id, title")
          .in("id", articleIds);

        if (articleError) {
          console.warn("Could not resolve comment article titles:", articleError.message);
        } else {
          (articleRows || []).forEach((article: any) => {
            titleByArticleId.set(article.id, article.title);
          });
        }
      }

      return rows.map((row: any) =>
        this.mapCommentFromDb(row, titleByArticleId.get(row.article_id))
      );
    } catch (error) {
      console.error("Error in fetchComments:", error);
      try {
        return await this.fetchCommentsFromApi(articleId);
      } catch (apiError) {
        console.error("Error fetching comments from API fallback:", apiError);
        return [];
      }
    }
  }

  /**
   * Insert a new comment
   */
  async insertComment(
    comment: Omit<Comment, "id" | "timestamp">,
  ): Promise<Comment | null> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const comments = await this.fetchComments();
        const newComment = {
          ...comment,
          id: Date.now().toString(),
          timestamp: Date.now(),
        } as Comment;

        comments.push(newComment);
        localStorage.setItem(
          this.COMMENT_STORAGE_KEY,
          JSON.stringify(comments),
        );

        const fetchResult = await this.fetchArticles();
        const articles = fetchResult.data;
        const article = articles.find((a) => a.id === comment.articleId);
        if (article) {
          newComment.articleTitle = article.title;
        }

        return newComment;
      } catch (error) {
        console.error("Error inserting comment to localStorage:", error);
        return null;
      }
    }

    // Use Supabase — resolve articleTitle with a targeted single-row query instead of fetchArticles()
    try {
      const saved = await this.insertCommentViaApi(comment);
      if (saved) return saved;
    } catch (apiError) {
      console.warn("Comment API insert failed; falling back to Supabase client:", apiError);
    }

    try {
      const insertPayload = {
        article_id: comment.articleId,
        author: comment.author,
        text: (comment as any).text,
      };

      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.COMMENTS)
        .insert(insertPayload)
        .select("id, article_id, author, text, created_at")
        .single();

      if (error) {
        throw new Error(`Error inserting comment: ${error.message}`);
      }

      const newComment = this.mapCommentFromDb(data);

      // Resolve articleTitle with a single targeted lookup — no full table scan
      const { data: articleRow } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .select("title")
        .eq("id", comment.articleId)
        .maybeSingle();

      if (articleRow) newComment.articleTitle = articleRow.title;

      return newComment;
    } catch (error) {
      console.error("Error in insertComment:", error);
      return null;
    }
  }

  /**
   * Delete a comment by ID
   */
  async deleteComment(id: string): Promise<boolean> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const comments = await this.fetchComments();
        const filtered = comments.filter((c) => c.id !== id);
        localStorage.setItem(
          this.COMMENT_STORAGE_KEY,
          JSON.stringify(filtered),
        );
        return true;
      } catch (error) {
        console.error("Error deleting comment from localStorage:", error);
        return false;
      }
    }

    try {
      return await this.deleteCommentViaApi(id);
    } catch (apiError) {
      console.warn("Comment API delete failed; falling back to Supabase client:", apiError);
    }

    // Use Supabase as a fallback.
    try {
      const { error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.COMMENTS)
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(`Error deleting comment: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error in deleteComment:", error);
      return false;
    }
  }

  /**
   * Update a comment text by ID
   */
  async updateComment(id: string, text: string): Promise<Comment | null> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const comments = await this.fetchComments();
        const index = comments.findIndex((c) => c.id === id);
        if (index !== -1) {
          comments[index].text = text;
          localStorage.setItem(this.COMMENT_STORAGE_KEY, JSON.stringify(comments));
          return comments[index];
        }
        return null;
      } catch (error) {
        console.error("Error updating comment in localStorage:", error);
        return null;
      }
    }

    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.COMMENTS)
        .update({ text })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating comment: ${error.message}`);
      }

      return this.mapCommentFromDb(data, undefined);
    } catch (error) {
      console.error("Error in updateComment:", error);
      return null;
    }
  }

  /**
   * Add a reaction to a comment
   */
  async addReaction(id: string, reaction: string): Promise<boolean> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const comments = await this.fetchComments();
        const comment = comments.find(c => c.id === id);
        if (comment) {
          comment.reactions = comment.reactions || {};
          comment.reactions[reaction] = (comment.reactions[reaction] || 0) + 1;
          localStorage.setItem(this.COMMENT_STORAGE_KEY, JSON.stringify(comments));
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error adding reaction to localStorage:", error);
        return false;
      }
    }

    try {
      const { data: comment, error: fetchError } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.COMMENTS)
        .select("reactions")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const reactions = comment?.reactions || {};
      reactions[reaction] = (reactions[reaction] || 0) + 1;

      const { error: updateError } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.COMMENTS)
        .update({ reactions })
        .eq("id", id);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error("Error in addReaction:", error);
      return false;
    }
  }

  /**
   * Fetch breaking news items
   */
  async fetchBreakingNews(): Promise<BreakingNewsItem[]> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const stored = localStorage.getItem(this.BREAKING_NEWS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error("Error fetching breaking news from localStorage:", error);
        return [];
      }
    }

    // Use Supabase
    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.BREAKING_NEWS)
        .select("id, text, active, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .range(0, 9);

      if (error) {
        throw new Error(`Error fetching breaking news: ${error.message}`);
      }

      return data as BreakingNewsItem[];
    } catch (error) {
      console.error("Error in fetchBreakingNews:", error);
      return [];
    }
  }

  /**
   * Insert a new breaking news item
   */
  async insertBreakingNews(text: string): Promise<BreakingNewsItem | null> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const breakingNews = await this.fetchBreakingNews();
        const newItem = {
          id: Date.now().toString(),
          text,
          active: true,
        } as BreakingNewsItem;

        breakingNews.push(newItem);
        localStorage.setItem(
          this.BREAKING_NEWS_STORAGE_KEY,
          JSON.stringify(breakingNews),
        );

        return newItem;
      } catch (error) {
        console.error("Error inserting breaking news to localStorage:", error);
        return null;
      }
    }

    // Use Supabase
    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.BREAKING_NEWS)
        .insert([
          {
            text,
            active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select("id, text, active, created_at")
        .single();

      if (error) {
        throw new Error(`Error inserting breaking news: ${error.message}`);
      }

      return data as BreakingNewsItem;
    } catch (error) {
      console.error("Error in insertBreakingNews:", error);
      return null;
    }
  }

  /**
   * Delete a breaking news item
   */
  async deleteBreakingNews(id: string): Promise<boolean> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const breakingNews = await this.fetchBreakingNews();
        const filtered = breakingNews.filter((b) => b.id !== id);
        localStorage.setItem(
          this.BREAKING_NEWS_STORAGE_KEY,
          JSON.stringify(filtered),
        );
        return true;
      } catch (error) {
        console.error("Error deleting breaking news from localStorage:", error);
        return false;
      }
    }

    // Use Supabase
    try {
      const { error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.BREAKING_NEWS)
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(`Error deleting breaking news: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error in deleteBreakingNews:", error);
      return false;
    }
  }

  /**
   * Fetch registered users
   */
  async fetchUsers(): Promise<User[]> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const stored = localStorage.getItem(this.USER_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error("Error fetching users from localStorage:", error);
        return [];
      }
    }

    // Use Supabase
    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.USERS)
        .select("username, email, created_at")
        .range(0, 99);

      if (error) {
        throw new Error(`Error fetching users: ${error.message}`);
      }

      return data as User[];
    } catch (error) {
      console.error("Error in fetchUsers:", error);
      return [];
    }
  }

  async fetchAdPlacement(): Promise<AdPlacement> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      return this.getLocalAdPlacement();
    }

    // views are always stored locally (not in Supabase), so we always read them from localStorage
    const localViews = this.getLocalAdPlacement().views || 0;

    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.AD_PLACEMENTS)
        .select("id, title, image_url, target_url, active, updated_at")
        .eq("id", "sidebar-main")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const mapped = this.mapAdFromDb(data);
        // If Supabase has the ad but imageUrl is empty (e.g. image was too large to save
        // to Supabase or was saved locally only), merge with localStorage imageUrl
        if (!mapped.imageUrl) {
          const local = this.getLocalAdPlacement();
          if (local.imageUrl) mapped.imageUrl = local.imageUrl;
        }
        // Always merge local views since they aren't stored in Supabase
        mapped.views = localViews;
        return mapped;
      }
      return this.getLocalAdPlacement();
    } catch (error) {
      console.error("Error in fetchAdPlacement:", error);
      return this.getLocalAdPlacement();
    }
  }

  async saveAdPlacement(ad: AdPlacement): Promise<AdPlacement | null> {
    const saved = this.saveLocalAdPlacement(ad);

    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      return saved;
    }

    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.AD_PLACEMENTS)
        .upsert(
          {
            id: "sidebar-main",
            title: saved.title,
            image_url: saved.imageUrl,
            target_url: saved.targetUrl,
            active: saved.active,
            updated_at: saved.updatedAt,
          },
          { onConflict: "id" },
        )
        .select("id, title, image_url, target_url, active, updated_at")
        .single();

      if (error) throw error;
      return this.mapAdFromDb(data);
    } catch (error) {
      console.error("Error in saveAdPlacement:", error);
      return saved;
    }
  }

  async clearAdPlacement(): Promise<boolean> {
    localStorage.removeItem(this.AD_STORAGE_KEY);

    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      return true;
    }

    try {
      const { error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.AD_PLACEMENTS)
        .delete()
        .eq("id", "sidebar-main");

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error in clearAdPlacement:", error);
      return false;
    }
  }

  async trackAdView(): Promise<void> {
    const ad = this.getLocalAdPlacement();
    if (ad && ad.active && ad.imageUrl) {
      ad.views = (ad.views || 0) + 1;
      localStorage.setItem(this.AD_STORAGE_KEY, JSON.stringify(ad));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paqtebi-ad-view-tracked', { detail: { views: ad.views } }));
      }
    }
  }

  async fetchAdInquiries(): Promise<AdInquiry[]> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      return this.getLocalAdInquiries();
    }

    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.AD_INQUIRIES)
        .select("id, full_name, phone, email, message, created_at")
        .order("created_at", { ascending: false })
        .range(0, 99);

      if (error) throw error;
      return (data || []).map((row) => this.mapAdInquiryFromDb(row));
    } catch (error) {
      console.error("Error in fetchAdInquiries:", error);
      return this.getLocalAdInquiries();
    }
  }

  async insertAdInquiry(inquiry: Omit<AdInquiry, "id" | "createdAt">): Promise<AdInquiry | null> {
    const localInquiry: AdInquiry = {
      ...inquiry,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const localInquiries = this.getLocalAdInquiries();
    localStorage.setItem(
      this.AD_INQUIRIES_STORAGE_KEY,
      JSON.stringify([localInquiry, ...localInquiries].slice(0, 100)),
    );

    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      return localInquiry;
    }

    try {
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.AD_INQUIRIES)
        .insert([
          {
            full_name: inquiry.fullName,
            phone: inquiry.phone,
            email: inquiry.email,
            message: inquiry.message,
            created_at: localInquiry.createdAt,
          },
        ])
        .select("id, full_name, phone, email, message, created_at")
        .single();

      if (error) throw error;
      return this.mapAdInquiryFromDb(data);
    } catch (error) {
      console.error("Error in insertAdInquiry:", error);
      return localInquiry;
    }
  }
}

export default new RemoteApiService();
