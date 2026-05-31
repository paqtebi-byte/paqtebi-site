import React, { useState, useEffect, Suspense, useCallback } from "react";
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import { Article, User } from "./types";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { Sidebar } from "./components/Sidebar";
import DarkModeToggle from "./components/DarkModeToggle";
import { WeatherWidget } from "./components/WeatherWidget";
import { CurrencyWidget } from "./components/CurrencyWidget";
import { LazyImage } from "./components/LazyImage";
import { BrandLogo } from "./components/BrandLogo";
import { LinkedText } from "./components/LinkedText";
import { ArticleExcerpt } from "./components/ArticleExcerpt";
import { stripHtmlToText } from "./utils/articleHtml";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotFound } from "./components/NotFound";
import {
  ArrowRight,
  ChevronDown,
  Search,
  Menu,
  X,
  UserCog,
  LogIn,
  User as UserIcon,
  LogOut,
  Bell,
  Bookmark,
  Heart,
  Clock,
  TrendingUp,
} from "lucide-react";
import { NAV_ITEMS, FEED_CATEGORIES } from "./config";
import { ToastProvider } from "./context/ToastContext";
import { DarkModeProvider } from "./context/DarkModeContext";

import { useAuth } from "./hooks/useAuth";
import { useArticles } from "./hooks/useArticles";
import { useBreakingNews } from "./hooks/useBreakingNews";
import { useBookmarks } from "./hooks/useBookmarks";

const loadArticleDetail = () => import("./components/ArticleDetail");
const loadLivePage = () => import("./components/LivePage");
const loadVideoPage = () => import("./components/VideoPage");

const ArticleDetail = React.lazy(() =>
  loadArticleDetail().then((m) => ({ default: m.ArticleDetail }))
);
const LivePage = React.lazy(() =>
  loadLivePage().then((m) => ({ default: m.LivePage }))
);
const VideoPage = React.lazy(() =>
  loadVideoPage().then((m) => ({ default: m.VideoPage }))
);
const AdminDashboard = React.lazy(() =>
  import("./components/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);
const Login = React.lazy(() =>
  import("./components/Login").then((m) => ({ default: m.Login }))
);
const AuthModal = React.lazy(() =>
  import("./components/AuthModal").then((m) => ({ default: m.AuthModal }))
);

const ForgotPassword = React.lazy(() =>
  import("./components/ForgotPassword").then((m) => ({ default: m.ForgotPassword }))
);
const ResetPassword = React.lazy(() =>
  import("./components/ResetPassword").then((m) => ({ default: m.ResetPassword }))
);

const getContentRoute = (article: Article) => {
  if (article.contentType === "live") return `/live/${article.id}`;
  if (article.contentType === "video") {
    if (article.category === "პოდკასტები") return `/podcasts/${article.id}`;
    if (article.category === "საინტერესო") return `/interesting/${article.id}`;
    return `/video-reports/${article.id}`;
  }
  return `/article/${article.id}`;
};

const preloadContentRoute = (article: Article) => {
  if (article.contentType === "live") {
    void loadLivePage();
    return;
  }
  if (article.contentType === "video") {
    void loadVideoPage();
    return;
  }
  void loadArticleDetail();
};

const LIVE_NAV_LINKS = ["LIVE", "პირდაპირი ეთერი"];
const VIDEO_NAV_LINKS = ["ვიდეო რეპორტაჟები", "ვიდეორეპორტაჟი"];
const PODCASTS_NAV_LINKS = ["პოდკასტები", "პოდკასტი"];
const INTERESTING_NAV_LINKS = ["საინტერესო"];

const preloadMenuRoute = (_itemIndex: number, _linkIndex: number, link: string) => {
  if (LIVE_NAV_LINKS.includes(link)) {
    void loadLivePage();
  } else if (VIDEO_NAV_LINKS.includes(link) || PODCASTS_NAV_LINKS.includes(link) || INTERESTING_NAV_LINKS.includes(link)) {
    void loadVideoPage();
  }
};

const PRIMARY_FEED_CATEGORIES = FEED_CATEGORIES.slice(0, 6);
const SECONDARY_FEED_CATEGORIES = FEED_CATEGORIES.slice(6);
const ARTICLE_VIEW_STORAGE_KEY = 'paqtebi_article_views';
const ARTICLE_VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

const getEffectiveSiteUser = (
  currentUser: User | null,
  isAdminAuthenticated: boolean,
  currentAdmin?: { username?: string; email?: string } | null
): User | null => {
  if (currentUser) return currentUser;
  if (!isAdminAuthenticated) return null;

  return {
    username: currentAdmin?.username || "Admin",
    email: currentAdmin?.email,
  };
};

/* ─────────────────────────────────────────────────────────────────
   MAIN SITE LAYOUT
───────────────────────────────────────────────────────────────── */
const MainSite: React.FC<{ viewMode?: "home" | "saved" }> = ({ viewMode = "home" }) => {
  const navigate = useNavigate();
  const { currentUser, isAdminAuthenticated, logoutPublic, setCurrentUser } = useAuth();
  const { articles, loading, error, loadAllNews } = useArticles();
  const { breakingNews } = useBreakingNews();
  const { bookmarkedIds } = useBookmarks();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(FEED_CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { loadAllNews(); }, [loadAllNews]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      
      // Sync sidebar scrolling with main window scrolling
      const sidebar = document.getElementById('sidebar-scroll');
      if (sidebar) {
        // Calculate how far down the page the user has scrolled
        const maxWindowScroll = document.body.scrollHeight - window.innerHeight;
        // If there's nowhere to scroll, avoid division by zero
        if (maxWindowScroll > 0) {
          const scrollPercentage = window.scrollY / maxWindowScroll;
          const maxSidebarScroll = sidebar.scrollHeight - sidebar.clientHeight;
          // Apply the same percentage to the sidebar
          sidebar.scrollTop = scrollPercentage * maxSidebarScroll;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleArticleClick = useCallback((article: Article) => {
    try {
      const now = Date.now();
      const raw = localStorage.getItem(ARTICLE_VIEW_STORAGE_KEY);
      const events = raw ? JSON.parse(raw) : [];
      const recentEvents = Array.isArray(events)
        ? events.filter((event) => now - Number(event.timestamp) < ARTICLE_VIEW_WINDOW_MS)
        : [];

      recentEvents.push({ articleId: article.id, timestamp: now });
      localStorage.setItem(ARTICLE_VIEW_STORAGE_KEY, JSON.stringify(recentEvents.slice(-300)));
    } catch {}

    navigate(getContentRoute(article), { state: { article } });
    window.scrollTo(0, 0);
  }, [navigate]);

  const handleMenuLink = (_itemIndex: number, _linkIndex: number, link: string) => {
    setSearchQuery("");
    setIsSearchOpen(false);
    setMobileMenuOpen(false);
    if (LIVE_NAV_LINKS.includes(link)) {
      navigate("/live");
      return;
    }
    if (VIDEO_NAV_LINKS.includes(link)) {
      navigate("/video-reports");
      return;
    }
    if (PODCASTS_NAV_LINKS.includes(link)) {
      navigate("/podcasts");
      return;
    }
    if (INTERESTING_NAV_LINKS.includes(link)) {
      navigate("/interesting");
      return;
    }
    setSelectedCategory(link);
    navigate("/");
    // Scroll to feed section
    setTimeout(() => {
      const feed = document.getElementById('feed-section');
      if (feed) {
        // Offset for the fixed header
        const y = feed.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleFeedCategoryClick = (cat: string) => {
    if (
      LIVE_NAV_LINKS.includes(cat) ||
      VIDEO_NAV_LINKS.includes(cat) ||
      PODCASTS_NAV_LINKS.includes(cat) ||
      INTERESTING_NAV_LINKS.includes(cat)
    ) {
      handleMenuLink(0, 0, cat);
      return;
    }

    setSelectedCategory(cat);
  };

  const handleBackToHome = () => {
    navigate("/");
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const articleOnlyItems = articles.filter((a) => (a.contentType || "article") === "article");
  const explicitHeroArticle = articleOnlyItems.find((a) => a.layout === "hero");
  const heroArticle = explicitHeroArticle;
  const heroHasArticleContent = Boolean(heroArticle?.content?.replace(/<[^>]*>/g, "").trim());
  const sidebarArticles = articleOnlyItems.filter((a) => a.layout === "sidebar");
  const mainFeedArticles = articleOnlyItems.filter(
    (a) => (a.layout === "standard" || !a.layout) && (explicitHeroArticle ? a.id !== explicitHeroArticle.id : true)
  );

  const getFilteredArticles = () => {
    if (viewMode === "saved") return articleOnlyItems.filter((a) => bookmarkedIds.includes(a.id));
    return mainFeedArticles.filter((article) => {
      const matchesCategory = selectedCategory === FEED_CATEGORIES[0] || article.category === selectedCategory;
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.summary || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  const filteredFeedArticles = getFilteredArticles();
  const now = new Date();
  const timeStr = now.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("ka-GE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const feedTitle =
    viewMode === "saved"
      ? "შენახული სტატიები"
      : searchQuery
      ? `ძიება: "${searchQuery}"`
      : "ბოლო სიახლეები";
  const feedEyebrow =
    viewMode === "saved"
      ? "თქვენი არქივი"
      : searchQuery
      ? "ძიების შედეგები"
      : "რედაქციის ლენტა";

  return (
    <div className="min-h-screen bg-white dark:bg-[#070b14] text-news-black dark:text-gray-100 font-sans flex flex-col transition-colors duration-300">
      <Suspense fallback={null}>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onLoginSuccess={(user) => setCurrentUser(user)}
          />
        )}
      </Suspense>

      {/* ── TOP BAR ───────────────────────────────────────────── */}
      <div className="hidden lg:flex bg-news-black text-white px-6 py-2 justify-between items-center text-xs">
        <div className="flex items-center gap-4 text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock size={11} />
            <span>{timeStr}</span>
          </div>
          <span className="text-gray-600">|</span>
          <span>{dateStr}</span>
        </div>
        <div className="flex items-center gap-6 text-gray-400">
          {["Facebook", "Twitter", "YouTube", "Instagram"].map((s) => (
            <a key={s} href="#" className="hover:text-white transition-colors">{s}</a>
          ))}
        </div>
      </div>

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled ? "navbar shadow-md dark:bg-[#0b0f19]/95 dark:border-gray-800" : "bg-white dark:bg-[#0b0f19] border-b border-gray-100 dark:border-gray-800"
        }`}
      >
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
              onClick={handleBackToHome}
            >
              <BrandLogo className="h-9 w-12 flex-shrink-0" />
              <div>
                <span className="text-xl font-black tracking-tight text-news-black dark:text-white uppercase">Paqtebi</span>
                <div className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">ქართული სიახლეები</div>
              </div>
            </div>

            {/* Nav (desktop) */}
            <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center">
              {NAV_ITEMS.map((item, idx) => (
                <div key={idx} className="relative group">
                  <button className="flex items-center gap-1 px-3 py-5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-news-accent transition-colors whitespace-nowrap">
                    {item.title}
                    <ChevronDown size={13} className="group-hover:rotate-180 transition-transform duration-200 opacity-60" />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-52 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 z-50 overflow-hidden">
                    <div className="py-1.5">
                      {item.links.map((link, li) => (
                        <button
                          key={li}
                          type="button"
                          onMouseEnter={() => preloadMenuRoute(idx, li, link)}
                          onFocus={() => preloadMenuRoute(idx, li, link)}
                          onClick={() => handleMenuLink(idx, li, link)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/25 hover:text-news-accent transition-colors"
                        >
                          <span className="w-1 h-1 bg-news-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          {link}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <DarkModeToggle />

              {/* Search overlay */}
              {isSearchOpen ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ძიება..."
                      className="pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-news-black dark:text-white rounded-full w-56 focus:outline-none focus:border-news-accent focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 transition-all"
                    />
                  </div>
                  <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="btn-ghost p-2">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsSearchOpen(true)} className="btn-ghost p-2" aria-label="ძიება">
                  <Search size={18} />
                </button>
              )}

              {/* User */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-news-accent to-red-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {currentUser.username[0]?.toUpperCase()}
                    </div>
                    <span className="hidden md:block">{currentUser.username}</span>
                    <ChevronDown size={14} className="opacity-50" />
                  </button>
                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xl py-1.5 z-50 animate-fade-in">
                      <button
                        onClick={() => { navigate("/saved"); setUserDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-news-accent"
                      >
                        <Bookmark size={15} /> შენახული
                      </button>
                      <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                      <button
                        onClick={() => { logoutPublic(); setUserDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                      >
                        <LogOut size={15} /> გასვლა
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-news-accent border border-gray-200 dark:border-gray-700 rounded-full hover:border-news-accent transition-all"
                >
                  <LogIn size={15} />
                  შესვლა
                </button>
              )}

              {isAdminAuthenticated && (
                <button
                  onClick={() => navigate("/admin")}
                  className="hidden sm:flex items-center gap-1.5 rounded-full border border-news-accent/25 bg-news-accent/10 px-3.5 py-2 text-xs font-black uppercase tracking-wide text-news-accent shadow-sm transition-all hover:-translate-y-0.5 hover:border-news-accent hover:bg-news-accent hover:text-white dark:border-news-accent/40 dark:bg-news-accent/15"
                  title="ადმინ პანელი"
                >
                  <UserCog size={14} />
                  Admin
                </button>
              )}

              {/* Mobile menu */}
              <button
                className="xl:hidden btn-ghost p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="მენიუ"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 shadow-lg animate-fade-up">
            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-gray-50 dark:bg-gray-900">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">თემა</span>
                <DarkModeToggle />
              </div>
              {!currentUser ? (
                <button
                  onClick={() => { setMobileMenuOpen(false); setIsAuthModalOpen(true); }}
                  className="w-full btn-primary justify-center mb-3"
                >
                  <LogIn size={16} /> შესვლა / რეგისტრაცია
                </button>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl mb-3">
                  <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-br from-news-accent to-red-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {currentUser.username[0]?.toUpperCase()}
                    </div>
                    {currentUser.username}
                  </div>
                  <button onClick={logoutPublic} className="text-sm text-gray-400 hover:text-red-500">გასვლა</button>
                </div>
              )}
              {isAdminAuthenticated && (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate("/admin"); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-news-accent/25 bg-news-accent/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-news-accent transition-all hover:bg-news-accent hover:text-white"
                >
                  <UserCog size={16} />
                  Admin
                </button>
              )}
              {NAV_ITEMS.map((item, idx) => (
                <div key={idx}>
                  <div className="px-3 py-2 font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.title}</div>
                  <div className="pl-3 space-y-0.5">
                    {item.links.map((link, li) => (
                      <button
                        key={li}
                        type="button"
                        onMouseEnter={() => preloadMenuRoute(idx, li, link)}
                        onFocus={() => preloadMenuRoute(idx, li, link)}
                        onClick={() => {
                            handleMenuLink(idx, li, link);
                            setMobileMenuOpen(false);
                          }}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-news-accent rounded-lg hover:bg-red-50 dark:hover:bg-red-950/25 transition-colors"
                      >
                        {link}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── BREAKING NEWS TICKER ────────────────────────────────── */}
      <div className="bg-news-black text-white py-2.5 overflow-hidden flex-shrink-0">
        <div className="max-w-screen-xl mx-auto px-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-news-accent px-3 py-1 text-[10px] font-black uppercase tracking-wider shrink-0 rounded-sm animate-pulse-slow">
            <Bell size={10} />
            LIVE
          </div>
          <div className="overflow-hidden flex-1">
            <div className="animate-marquee text-xs text-gray-300 font-medium">
              {breakingNews.length > 0
                ? breakingNews.map((news) => (
                  <span key={news.id}>
                    <span className="mx-6 text-news-accent">•</span>
                    <LinkedText
                      text={news.text}
                      linkClassName="text-white underline decoration-news-accent/70 underline-offset-4 transition-colors hover:text-news-accent"
                    />
                  </span>
                ))
                : <span><span className="mx-4 text-news-accent">•</span>კეთილი იყოს თქვენი მობრძანება Paqtebi-ზე</span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      {viewMode === "home" && (
        loading ? (
          <div className="w-full animate-pulse bg-gray-200 dark:bg-gray-900" style={{ height: "520px" }} />
        ) : (
        <section
          className={`relative w-full overflow-hidden group ${heroHasArticleContent ? "cursor-pointer" : ""}`}
          style={{ height: "520px" }}
          onClick={() => heroHasArticleContent && heroArticle && handleArticleClick(heroArticle)}
        >
          <div className="absolute inset-0">
            <LazyImage
              src={
                heroArticle?.imageUrl ||
                "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop"
              }
              alt={heroArticle?.title || "Main Hero"}
              className="w-full h-full transition-transform duration-700 group-hover:scale-105"
              loading="eager"
            />
            <div className="hero-overlay absolute inset-0" />
          </div>

          {/* Widgets */}
          <div
            className="absolute top-6 right-6 z-10 hidden lg:flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <CurrencyWidget />
            <WeatherWidget />
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10">
            <div className="max-w-screen-xl mx-auto">
              <div className="max-w-3xl animate-fade-up">
                <div className="flex items-center gap-3 mb-4">
                  <span className="category-badge">
                    {heroArticle?.category || "მთავარი"}
                  </span>
                  {heroArticle?.date && (
                    <span className="text-gray-300 text-xs flex items-center gap-1">
                      <Clock size={11} />
                      {heroArticle.date}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-snug font-serif mb-4 tracking-normal">
                  {heroArticle?.title || "თანამედროვე სამყაროს გლობალური გამოწვევები და ახალი პერსპექტივები"}
                </h1>
                <p className="text-gray-200 text-lg font-light leading-relaxed line-clamp-2 mb-6">
                  {stripHtmlToText(heroArticle?.summary || "მიიღეთ ობიექტური და გადამოწმებული ინფორმაცია მიმდინარე მოვლენების შესახებ.")}
                </p>
                {heroHasArticleContent && (
                  <div className="inline-flex items-center gap-2 text-white font-bold text-sm bg-white/10 hover:bg-white/20 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/20 transition-all">
                    სრულად წაკითხვა <ArrowRight size={15} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        )
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main id="feed-section" className="max-w-screen-xl mx-auto w-full px-4 md:px-6 py-10 flex-1">
        {error && (
          <div className="text-center py-12 bg-red-50 dark:bg-red-950/20 rounded-xl mb-8 border border-red-100 dark:border-red-900/40" role="alert">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Feed */}
            <div className="lg:col-span-8">
              {/* Filter Bar */}
              <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-news-accent ring-1 ring-red-100 dark:bg-red-950/25 dark:ring-red-900/40">
                      <TrendingUp size={19} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-news-accent">
                        {feedEyebrow}
                      </div>
                      <h2 className="mt-1 text-2xl md:text-3xl font-black leading-tight text-news-black dark:text-white font-serif">
                        {feedTitle}
                      </h2>
                    </div>
                  </div>

                  {!searchQuery && viewMode === "home" && (
                    <div className="w-full">
                      <div
                        className="rounded-2xl border border-gray-200/80 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/45"
                        role="tablist"
                        aria-label="სიახლეების კატეგორიები"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {PRIMARY_FEED_CATEGORIES.map((cat) => {
                              const active = selectedCategory === cat;
                              return (
                                <button
                                  key={cat}
                                  role="tab"
                                  aria-selected={active}
                                  onClick={() => handleFeedCategoryClick(cat)}
                                  className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-center text-xs font-extrabold transition-all ${
                                    active
                                      ? "bg-news-accent text-white shadow-sm shadow-red-900/10"
                                      : "bg-gray-100/80 text-gray-600 ring-1 ring-gray-200/70 hover:bg-white hover:text-news-black hover:ring-gray-300 dark:bg-gray-950/70 dark:text-gray-300 dark:ring-gray-800 dark:hover:bg-gray-800 dark:hover:text-white"
                                  }`}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>

                          <details
                            className="group border-t border-gray-100 pt-3 dark:border-gray-800"
                            open={!PRIMARY_FEED_CATEGORIES.includes(selectedCategory)}
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-1 text-xs font-black uppercase tracking-[0.14em] text-gray-400 transition-colors hover:text-news-accent">
                              <span>გახსენი ყველა კატეგორია</span>
                              <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {SECONDARY_FEED_CATEGORIES.map((cat) => {
                                const active = selectedCategory === cat;
                                return (
                                  <button
                                    key={cat}
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => handleFeedCategoryClick(cat)}
                                    className={`inline-flex min-h-9 items-center justify-center rounded-full px-3.5 py-1.5 text-center text-[11px] font-bold transition-all ${
                                      active
                                        ? "bg-news-accent text-white shadow-sm"
                                        : "text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-news-black dark:text-gray-400 dark:ring-gray-800 dark:hover:bg-gray-800 dark:hover:text-white"
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                );
                              })}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden">
                <div className="flex items-center gap-3">
                  <TrendingUp size={18} className="text-news-accent" />
                  <h2 className="section-title">
                    {viewMode === "saved"
                      ? "შენახული სტატიები"
                      : searchQuery
                      ? `ძიება: "${searchQuery}"`
                      : "ბოლო სიახლეები"}
                  </h2>
                </div>

                {!searchQuery && viewMode === "home" && (
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-wrap" role="tablist">
                    {FEED_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        role="tab"
                        aria-selected={selectedCategory === cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                          selectedCategory === cat
                            ? "bg-news-accent text-white shadow-sm"
                            : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Articles Grid */}
              {filteredFeedArticles.length === 0 ? (
                <div className="py-20 text-center bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  {viewMode === "saved" ? (
                    <>
                      <Heart className="mx-auto text-gray-200 mb-4" size={52} />
                      <p className="text-gray-400 font-medium">შენახული სტატიები არ არის</p>
                      <button onClick={handleBackToHome} className="mt-4 text-news-accent font-bold text-sm hover:underline">
                        სიახლეების ნახვა →
                      </button>
                    </>
                  ) : (
                    <>
                      <Search className="mx-auto text-gray-200 mb-4" size={52} />
                      <p className="text-gray-400 font-medium">
                        {searchQuery ? "მოთხოვნით არაფერი მოიძებნა" : "ამ კატეგორიაში სიახლეები არ არის"}
                      </p>
                      <button
                        onClick={() => { setSelectedCategory(FEED_CATEGORIES[0]); setSearchQuery(""); }}
                        className="mt-4 text-news-accent font-bold text-sm hover:underline"
                      >
                        ყველა სიახლე →
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8 stagger">
                  {filteredFeedArticles.map((article) => (
                    <article
                      key={article.id}
                      className="news-card bg-white dark:bg-[#111827] border border-gray-100 dark:border-white/10 group cursor-pointer flex flex-col animate-fade-up"
                      onMouseEnter={() => preloadContentRoute(article)}
                      onFocus={() => preloadContentRoute(article)}
                      onClick={() => handleArticleClick(article)}
                      tabIndex={0}
                    >
                      {/* Image */}
                      <div className="relative overflow-hidden aspect-[16/9]">
                        <LazyImage
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full"
                        />
                        <div className="absolute bottom-3 left-3">
                          <span className="category-badge">{article.category}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-col flex-1 p-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2.5">
                          <Clock size={11} />
                          <span>{article.date}</span>
                          {article.author && (
                            <>
                              <span>•</span>
                              <span>{article.author}</span>
                            </>
                          )}
                        </div>
                        <h2 className="text-base font-bold leading-snug text-news-black dark:text-white mb-2.5 group-hover:text-news-accent transition-colors line-clamp-2 font-serif">
                          {article.title}
                        </h2>
                        <ArticleExcerpt
                          summary={article.summary}
                          className="flex-1 mb-4 opacity-75"
                        />
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50 dark:border-gray-800">
                          <span className="text-xs font-bold text-news-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                            სრულად <ArrowRight size={12} />
                          </span>
                          <Bookmark size={14} className="text-gray-300 hover:text-news-accent transition-colors" />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              <div id="sidebar-scroll" className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-6 scroll-smooth custom-scrollbar">
                <Sidebar articles={articleOnlyItems} customArticles={sidebarArticles} videos={articles.filter(a => a.contentType === 'video')} onArticleClick={handleArticleClick} />
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-news-darkblue text-white mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <BrandLogo className="h-9 w-12 flex-shrink-0" />
                <span className="text-xl font-black uppercase tracking-tight">Paqtebi</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                ობიექტური და ოპერატიული ინფორმაცია მსოფლიოს ნებისმიერი წერტილიდან.
              </p>
              <div className="flex gap-3 mt-5">
                {["Fb", "Tw", "YT", "IG"].map((s) => (
                  <a key={s} href="#" className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs text-gray-300 hover:bg-news-accent hover:text-white transition-all">
                    {s}
                  </a>
                ))}
              </div>
            </div>

            {NAV_ITEMS.slice(0, 3).map((item, i) => (
              <div key={i}>
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">{item.title}</h4>
                <ul className="space-y-2.5">
                  {item.links.map((link, li) => (
                    <li key={li}>
                      <button
                        type="button"
                        onMouseEnter={() => preloadMenuRoute(i, li, link)}
                        onFocus={() => preloadMenuRoute(i, li, link)}
                        onClick={() => handleMenuLink(i, li, link)}
                        className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
                      >
                        <span className="w-1 h-1 bg-news-accent rounded-full" />
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} Paqtebi. ყველა უფლება დაცულია.</p>
            <div className="flex gap-4">
              {["კონფიდენციალობა", "გამოყენების წესები", "კონტაქტი"].map((t) => (
                <a key={t} href="#" className="hover:text-gray-300 transition-colors">{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   ARTICLE DETAIL PAGE
───────────────────────────────────────────────────────────────── */
const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAdminAuthenticated, currentAdmin, setCurrentUser } = useAuth();
  const { articles, loading, loadAllNews } = useArticles();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const effectiveUser = getEffectiveSiteUser(currentUser, isAdminAuthenticated, currentAdmin);

  useEffect(() => {
    loadAllNews();
  }, [loadAllNews]);

  const stateArticle = location.state?.article as Article | undefined;
  const article = stateArticle || articles.find((a) => a.id === id);

  if (!article && loading) return <LoadingSkeleton />;
  if (!article) return <NotFound />;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ArticleDetail
        article={article}
        allArticles={articles}
        onBack={() => navigate("/")}
        currentUser={effectiveUser}
        onLoginRequest={() => setIsAuthModalOpen(true)}
        onNavigateToArticle={(article) => navigate(getContentRoute(article), { state: { article } })}
        isAdmin={isAdminAuthenticated}
      />
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(user) => setCurrentUser(user)}
        />
      )}
    </Suspense>
  );
};

const LiveRoutePage: React.FC = () => (
  <Suspense fallback={<LoadingSkeleton />}>
    <LivePage />
  </Suspense>
);

const VideoReportsRoutePage: React.FC = () => {
  const { currentUser, isAdminAuthenticated, currentAdmin, setCurrentUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const effectiveUser = getEffectiveSiteUser(currentUser, isAdminAuthenticated, currentAdmin);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <VideoPage
        category="ვიდეო რეპორტაჟები"
        title="ვიდეო რეპორტაჟები"
        currentUser={effectiveUser}
        onLoginRequest={() => setIsAuthModalOpen(true)}
        isAdmin={isAdminAuthenticated}
      />
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(user) => setCurrentUser(user)}
        />
      )}
    </Suspense>
  );
};

const PodcastsRoutePage: React.FC = () => {
  const { currentUser, isAdminAuthenticated, currentAdmin, setCurrentUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const effectiveUser = getEffectiveSiteUser(currentUser, isAdminAuthenticated, currentAdmin);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <VideoPage
        category="პოდკასტები"
        title="პოდკასტები"
        currentUser={effectiveUser}
        onLoginRequest={() => setIsAuthModalOpen(true)}
        isAdmin={isAdminAuthenticated}
      />
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(user) => setCurrentUser(user)}
        />
      )}
    </Suspense>
  );
};

const InterestingRoutePage: React.FC = () => {
  const { currentUser, isAdminAuthenticated, currentAdmin, setCurrentUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const effectiveUser = getEffectiveSiteUser(currentUser, isAdminAuthenticated, currentAdmin);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <VideoPage
        category="საინტერესო"
        title="საინტერესო"
        currentUser={effectiveUser}
        onLoginRequest={() => setIsAuthModalOpen(true)}
        isAdmin={isAdminAuthenticated}
      />
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(user) => setCurrentUser(user)}
        />
      )}
    </Suspense>
  );
};

/* ─────────────────────────────────────────────────────────────────
   ADMIN PAGES
───────────────────────────────────────────────────────────────── */
const AdminLoginPage: React.FC = () => {
  const { isAdminAuthenticated, isAdminAuthLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAdminAuthLoading && isAdminAuthenticated) navigate("/admin", { replace: true });
  }, [isAdminAuthenticated, isAdminAuthLoading, navigate]);
  if (isAdminAuthLoading) return <LoadingSkeleton />;
  return <Suspense fallback={<LoadingSkeleton />}><Login /></Suspense>;
};

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { loadAllNews } = useArticles();
  const handleLogout = () => { loadAllNews(); navigate("/"); };
  return <Suspense fallback={<LoadingSkeleton />}><AdminDashboard onLogout={handleLogout} /></Suspense>;
};

/* ─────────────────────────────────────────────────────────────────
   ROUTER
───────────────────────────────────────────────────────────────── */
const AppContent: React.FC = () => (
  <Routes>
    <Route path="/" element={<MainSite viewMode="home" />} />
    <Route path="/saved" element={<MainSite viewMode="saved" />} />
    <Route path="/article/:id" element={<ArticleDetailPage />} />
    <Route path="/live" element={<LiveRoutePage />} />
    <Route path="/live/:id" element={<LiveRoutePage />} />
    <Route path="/video" element={<VideoReportsRoutePage />} /> {/* Legacy fallback */}
    <Route path="/video/:id" element={<VideoReportsRoutePage />} />
    <Route path="/video-reports" element={<VideoReportsRoutePage />} />
    <Route path="/video-reports/:id" element={<VideoReportsRoutePage />} />
    <Route path="/podcasts" element={<PodcastsRoutePage />} />
    <Route path="/podcasts/:id" element={<PodcastsRoutePage />} />
    <Route path="/interesting" element={<InterestingRoutePage />} />
    <Route path="/interesting/:id" element={<InterestingRoutePage />} />
    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route path="/admin/forgot-password" element={<Suspense fallback={<LoadingSkeleton />}><ForgotPassword /></Suspense>} />
    <Route path="/admin/reset-password" element={<Suspense fallback={<LoadingSkeleton />}><ResetPassword /></Suspense>} />
    <Route path="/admin/reset-password/:token" element={<Suspense fallback={<LoadingSkeleton />}><ResetPassword /></Suspense>} />
    <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
    <Route path="/admin/*" element={<ProtectedRoute><Navigate to="/admin" replace /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App: React.FC = () => (
  <DarkModeProvider>
    <ToastProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ToastProvider>
  </DarkModeProvider>
);

export default App;
