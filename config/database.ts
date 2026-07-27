/** Shared browser-side Supabase configuration. */
export const DATABASE_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

  // Local storage is a development fallback only when public Supabase values are absent.
  USE_LOCAL_STORAGE:
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_ANON_KEY,

  TABLES: {
    ARTICLES: "articles",
    COMMENTS: "comments",
    BREAKING_NEWS: "breaking_news",
    USERS: "users",
    AD_PLACEMENTS: "ad_placements",
    AD_INQUIRIES: "ad_inquiries",
  },
};

export default DATABASE_CONFIG;
