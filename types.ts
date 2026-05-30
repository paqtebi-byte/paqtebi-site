export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  category: string;
  category_slug?: string;
  date: string;
  imageUrl: string;
  layout?: 'hero' | 'standard' | 'sidebar'; // Where to display the article

  // ვიდეო/ლაივ სტრიმინგის დამატებითი ველები
  contentType?: 'article' | 'video' | 'live';
  videoUrl?: string;
  videoProvider?: 'youtube' | 'facebook' | 'custom';
  videoId?: string;
  videoThumbnailUrl?: string;
  videoDuration?: string;
  isLive?: boolean;
  liveStatus?: 'scheduled' | 'live' | 'ended';
  scheduledAt?: string;
}

export interface Comment {
  id: string;
  articleId: string;
  articleTitle?: string; // Helper for admin panel
  author: string;
  text: string;
  timestamp: number;
  reactions?: Record<string, number>; // e.g., { 'like': 5, 'heart': 2 }
}

export interface NewsResponse {
  articles: Article[];
}

export interface User {
  username: string;
  email?: string;
  password?: string; // In a real app, never store plain text passwords!
}

export interface BreakingNewsItem {
  id: string;
  text: string;
  active: boolean;
}

export interface WeatherData {
  temp: number;
  code: number;
  windSpeed: number;
}

export type ViewState = 'HOME' | 'ARTICLE' | 'LOGIN' | 'ADMIN' | 'SAVED';

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface AnalyticsData {
  totalArticles: number;
  totalUsers: number;
  totalComments: number;
  totalViews: number; // Simulated
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  active: boolean;
  createdAt?: string;
}

export interface AdPlacement {
  title: string;
  imageUrl: string;
  targetUrl: string;
  active: boolean;
  updatedAt?: string;
}

export interface AdInquiry {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
}
