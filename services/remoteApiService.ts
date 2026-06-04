import type { SupabaseClient } from "@supabase/supabase-js";
import { AdInquiry, AdPlacement, Article, Comment, BreakingNewsItem, User } from "../types";
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
      : { title: "", imageUrl: "", targetUrl: "", active: false };
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

  private getLocalAdInquiries(): AdInquiry[] {
    const stored = localStorage.getItem(this.AD_INQUIRIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Fetch all articles from the database
   */
  async fetchArticles(contentType: Article["contentType"] | "all" = "all"): Promise<Article[]> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      try {
        const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
        const articles = stored ? JSON.parse(stored) : [];
        if (contentType === "all") return articles;
        return articles.filter((article: Article) => (article.contentType || "article") === contentType);
      } catch (error) {
        console.error("Error fetching articles from localStorage:", error);
        return [];
      }
    }

    // Use Supabase
    // NOTE: 'content' (full HTML body) is intentionally excluded here to minimise egress.
    // It is fetched on-demand only when a single article is opened (see fetchArticleById).
    try {
      let query = this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .select(
          "id, title, summary, author, category, category_slug, date, layout, imageUrl, content_type, video_url, video_provider, video_id, video_thumbnail_url, video_duration, is_live, live_status, scheduled_at, created_at, is_archived"
        )
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .range(0, 49);

      if (contentType !== "all") {
        query = query.eq("content_type", contentType);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching articles: ${error.message}`);
      }

      return (data || []).map((row) => this.mapArticleFromDb(row));
    } catch (error) {
      console.error("Error in fetchArticles:", error);
      return [];
    }
  }

  /**
   * Fetch a single article by ID including its full content body.
   * Called only when opening an article detail page by direct URL (no navigation state).
   */
  async fetchArticleById(id: string): Promise<Article | null> {
    if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
      const articles = await this.fetchArticles();
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
      return data ? this.mapArticleFromDb(data) : null;
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
        const articles = await this.fetchArticles();
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
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .insert([
          {
            ...this.mapArticleToDb(article as Partial<Article>),
            created_at: new Date().toISOString(),
          },
        ])
        .select()
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
        const articles = await this.fetchArticles();
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
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.ARTICLES)
        .update(this.mapArticleToDb(article))
        .eq("id", id)
        .select()
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
        const articles = await this.fetchArticles();
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

        if (articleId) {
          comments = comments.filter((c) => c.articleId === articleId);
        }

        const articles = await this.fetchArticles();
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

    // Use Supabase — join articles to resolve articleTitle in a single query
    try {
      let query = this.supabase!
        .from(DATABASE_CONFIG.TABLES.COMMENTS)
        .select(
          `id, article_id, author, content, timestamp, reactions,
          articles:${DATABASE_CONFIG.TABLES.ARTICLES}!article_id ( title )`
        )
        .order("timestamp", { ascending: false })
        .range(0, 49);

      if (articleId) {
        query = query.eq("article_id", articleId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching comments: ${error.message}`);
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        articleId: row.article_id,
        author: row.author,
        content: row.content,
        timestamp: row.timestamp,
        reactions: row.reactions,
        articleTitle: row.articles?.title ?? undefined,
      } as Comment));
    } catch (error) {
      console.error("Error in fetchComments:", error);
      return [];
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

        const articles = await this.fetchArticles();
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
      const { data, error } = await this.supabase!
        .from(DATABASE_CONFIG.TABLES.COMMENTS)
        .insert([
          {
            ...comment,
            timestamp: Date.now(),
          },
        ])
        .select("id, article_id, author, content, timestamp, reactions")
        .single();

      if (error) {
        throw new Error(`Error inserting comment: ${error.message}`);
      }

      const newComment = data as unknown as Comment;
      newComment.articleId = (data as any).article_id ?? comment.articleId;

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

    // Use Supabase
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
        .select()
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
        .select()
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
        .select()
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
