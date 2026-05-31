import { createClient } from "@supabase/supabase-js";
import { Article, Comment, BreakingNewsItem } from "../types";

// Environment variables should be configured in your .env.local file
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing Supabase environment variables. Please check your .env.local file.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Service class for handling all Supabase database operations
 */
class SupabaseService {
  /**
   * Fetch all articles from the database
   */
  async fetchArticles(): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id, title, summary, author, category, category_slug, date, layout, imageUrl, content_type, video_url, video_provider, video_id, video_thumbnail_url, video_duration, is_live, live_status, scheduled_at, created_at"
        )
        .order("created_at", { ascending: false })
        .range(0, 99);

      if (error) {
        throw new Error(`Error fetching articles: ${error.message}`);
      }

      return data as Article[];
    } catch (error) {
      console.error("Error in fetchArticles:", error);
      return [];
    }
  }

  /**
   * Insert a new article into the database
   */
  async insertArticle(article: Omit<Article, "id">): Promise<Article | null> {
    try {
      const { data, error } = await supabase
        .from("articles")
        .insert([
          {
            ...article,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Error inserting article: ${error.message}`);
      }

      return data as Article;
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
    try {
      const { data, error } = await supabase
        .from("articles")
        .update(article)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating article: ${error.message}`);
      }

      return data as Article;
    } catch (error) {
      console.error("Error in updateArticle:", error);
      return null;
    }
  }

  /**
   * Delete an article by ID
   */
  async deleteArticle(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("articles").delete().eq("id", id);

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
   * Fetch all comments for an article
   */
  async fetchComments(articleId?: string): Promise<Comment[]> {
    try {
      let query = supabase
        .from("comments")
        .select("id, article_id, author, content, timestamp, reactions")
        .order("timestamp", { ascending: false })
        .range(0, 49);

      if (articleId) {
        query = query.eq("article_id", articleId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching comments: ${error.message}`);
      }

      return data as Comment[];
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
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert([
          {
            ...comment,
            timestamp: Date.now(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Error inserting comment: ${error.message}`);
      }

      return data as Comment;
    } catch (error) {
      console.error("Error in insertComment:", error);
      return null;
    }
  }

  /**
   * Delete a comment by ID
   */
  async deleteComment(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", id);

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
   * Fetch breaking news items
   */
  async fetchBreakingNews(): Promise<BreakingNewsItem[]> {
    try {
      const { data, error } = await supabase
        .from("breaking_news")
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
    try {
      const { data, error } = await supabase
        .from("breaking_news")
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
    try {
      const { error } = await supabase
        .from("breaking_news")
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
  async fetchUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("username, email, created_at");

      if (error) {
        throw new Error(`Error fetching users: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error in fetchUsers:", error);
      return [];
    }
  }
}

export default new SupabaseService();
