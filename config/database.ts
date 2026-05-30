/**
 * Database Configuration
 * This file contains the configuration for your database setup.
 * Currently configured for localStorage, but ready for Supabase integration.
 */

// Environment variables
export const DATABASE_CONFIG = {
  // Supabase configuration (to be filled in after creating your Supabase project)
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

  // Fallback to localStorage if Supabase is not configured
  USE_LOCAL_STORAGE:
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Table names in Supabase (to be created later)
  TABLES: {
    ARTICLES: "articles",
    COMMENTS: "comments",
    BREAKING_NEWS: "breaking_news",
    USERS: "users",
    AD_PLACEMENTS: "ad_placements",
    AD_INQUIRIES: "ad_inquiries",
  },
};

/**
 * How to set up Supabase for your Georgian news platform:
 *
 * 1. Go to https://supabase.com and create a new project
 * 2. Copy your Project URL and Anonymous Key from Project Settings > API
 * 3. Add these to your .env.local file:
 *    VITE_SUPABASE_URL=your_project_url
 *    VITE_SUPABASE_ANON_KEY=your_anon_key
 *
 * 4. Create the required tables in Supabase SQL Editor:
 *
 * -- Create articles table
 * CREATE TABLE articles (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   summary TEXT,
 *   content TEXT,
 *   author TEXT,
 *   category TEXT,
 *   date TEXT,
 *   image_url TEXT,
 *   layout TEXT,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * -- Create comments table
 * CREATE TABLE comments (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   article_id UUID REFERENCES articles(id),
 *   author TEXT NOT NULL,
 *   text TEXT NOT NULL,
 *   timestamp BIGINT,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * -- Create breaking_news table
 * CREATE TABLE breaking_news (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   text TEXT NOT NULL,
 *   active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * -- Create users table
 * CREATE TABLE users (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   username TEXT UNIQUE NOT NULL,
 *   email TEXT UNIQUE,
 *   password_hash TEXT,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * -- Create ad placements table
 * CREATE TABLE ad_placements (
 *   id TEXT PRIMARY KEY,
 *   title TEXT,
 *   image_url TEXT,
 *   target_url TEXT,
 *   active BOOLEAN DEFAULT false,
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * -- Create ad inquiries table
 * CREATE TABLE ad_inquiries (
 *   id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 *   full_name TEXT NOT NULL,
 *   phone TEXT,
 *   email TEXT,
 *   message TEXT NOT NULL,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * 5. After setting up Supabase, remove the localStorage fallback and use the Supabase service
 */

export default DATABASE_CONFIG;
