import { createClient } from "@supabase/supabase-js";
import { DATABASE_CONFIG } from "../config/database";

let supabaseClient = null;

if (!DATABASE_CONFIG.USE_LOCAL_STORAGE) {
  if (!DATABASE_CONFIG.SUPABASE_URL || !DATABASE_CONFIG.SUPABASE_ANON_KEY) {
    console.error(
      "Missing Supabase environment variables. Please check your .env.local file.\n" +
        "Example: \n" +
        "VITE_SUPABASE_URL=https://your-project.supabase.co\n" +
        "VITE_SUPABASE_ANON_KEY=your-anon-key",
    );
  } else {
    supabaseClient = createClient(
      DATABASE_CONFIG.SUPABASE_URL,
      DATABASE_CONFIG.SUPABASE_ANON_KEY,
    );
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
  return supabaseClient;
};

export default getSupabaseClient;
