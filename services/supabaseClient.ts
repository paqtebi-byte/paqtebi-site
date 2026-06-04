import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DATABASE_CONFIG } from "../config/database";

type SupabaseGlobal = typeof globalThis & {
  __paqtebiSupabaseClient?: SupabaseClient | null;
};

let supabaseClient: SupabaseClient | null = null;

if (!DATABASE_CONFIG.USE_LOCAL_STORAGE) {
  if (!DATABASE_CONFIG.SUPABASE_URL || !DATABASE_CONFIG.SUPABASE_ANON_KEY) {
    console.error(
      "Missing Supabase environment variables. Please check your .env.local file.\n" +
        "Example: \n" +
        "VITE_SUPABASE_URL=https://your-project.supabase.co\n" +
        "VITE_SUPABASE_ANON_KEY=your-anon-key",
    );
  } else {
    const globalScope = globalThis as SupabaseGlobal;
    if (!globalScope.__paqtebiSupabaseClient) {
      globalScope.__paqtebiSupabaseClient = createClient(
        DATABASE_CONFIG.SUPABASE_URL,
        DATABASE_CONFIG.SUPABASE_ANON_KEY,
      );
    }
    supabaseClient = globalScope.__paqtebiSupabaseClient;
  }
}

/**
 * Get the Supabase client instance
 * Returns null if Supabase is not configured
 */
export const getSupabaseClient = () => {
  if (DATABASE_CONFIG.USE_LOCAL_STORAGE) {
    console.warn("Supabase not configured, using localStorage fallback");
    return null;
  }

  if (!supabaseClient) {
    const globalScope = globalThis as SupabaseGlobal;
    supabaseClient = globalScope.__paqtebiSupabaseClient ?? null;
  }

  return supabaseClient;
};

export default getSupabaseClient;
