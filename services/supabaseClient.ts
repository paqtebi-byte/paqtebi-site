import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DATABASE_CONFIG } from "../config/database";

let instance: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client for the browser SPA.
 * Returns null when Supabase env vars are missing (localStorage fallback mode).
 *
 * Uses a module-scoped variable — `createClient()` is called exactly once
 * for the lifetime of the page, eliminating "Multiple GoTrueClient" warnings.
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
    return null;
  }

  if (!instance) {
    if (!DATABASE_CONFIG.SUPABASE_URL || !DATABASE_CONFIG.SUPABASE_ANON_KEY) {
      console.error(
        "Missing Supabase environment variables. Please check your .env.local file.\n" +
          "Example:\n" +
          "VITE_SUPABASE_URL=https://your-project.supabase.co\n" +
          "VITE_SUPABASE_ANON_KEY=your-anon-key",
      );
      return null;
    }

    instance = createClient(
      DATABASE_CONFIG.SUPABASE_URL,
      DATABASE_CONFIG.SUPABASE_ANON_KEY,
    );
  }

  return instance;
};

export default getSupabaseClient;
