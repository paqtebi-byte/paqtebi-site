
import React, { useEffect, useState } from 'react';
import { Article, User as UserType } from '../types';
import { ArrowLeft, Clock, Tag, User, Facebook, Twitter, Link as LinkIcon, BookOpen, ZoomIn, ZoomOut, ArrowRight, Heart, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, MessageCircle, Share2, Copy, Send, Mail, Instagram, Youtube, Music2 } from 'lucide-react';
import { CommentSection } from './CommentSection';
import { useBookmarks } from '../hooks/useBookmarks';
import { LazyImage } from './LazyImage';
import { normalizeArticleHtml } from '../utils/articleHtml';
import { formatDayMonthYear } from '../utils/dateFormat';
import { summarizeArticle } from '../services/geminiService';
import { Sparkles, Loader2 } from 'lucide-react';
import apiService from '../services/apiService';

interface ArticleDetailProps {
  article: Article;
  allArticles: Article[]; // Passed to find related articles
  onBack: () => void;
  currentUser: UserType | null;
  onLoginRequest: () => void;
  onNavigateToArticle: (article: Article) => void;
  isAdmin?: boolean;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ 
  article, 
  allArticles, 
  onBack, 
  currentUser, 
  onLoginRequest,
  onNavigateToArticle,
  isAdmin
}) => {
  
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [articleReactions, setArticleReactions] = useState({ like: 0, dislike: 0 });
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const articleHtml = normalizeArticleHtml(article.content);
  const plainContent = articleHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Scroll to top when article changes and update Meta tags
  useEffect(() => {
    window.scrollTo(0, 0);

    // Update document title
    const originalTitle = document.title;
    document.title = `${article.title} - Paqtebi`;

    // Helper to set meta tags
    const setMetaTag = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
      return element;
    };

    // Set Open Graph tags for Facebook/Twitter sharing
    const metaTags = [
      setMetaTag('og:title', article.title),
      setMetaTag('og:description', article.summary || article.title),
      setMetaTag('og:image', article.imageUrl),
      setMetaTag('og:url', window.location.href),
      setMetaTag('og:type', 'article'),
    ];

    return () => {
      // Cleanup meta tags and title when unmounting
      document.title = originalTitle;
      metaTags.forEach(tag => {
        if (tag.parentNode) {
          tag.parentNode.removeChild(tag);
        }
      });
    };
  }, [article]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`paqtebi_article_reactions_${article.id}`);
      setArticleReactions(saved ? JSON.parse(saved) : { like: 0, dislike: 0 });
    } catch {
      setArticleReactions({ like: 0, dislike: 0 });
    }
  }, [article.id]);

  useEffect(() => {
    apiService.trackArticleView(article.id);
  }, [article.id]);

  // Calculate read time (approx 200 words per minute)
  const readTime = Math.max(1, Math.ceil(plainContent.split(' ').filter(Boolean).length / 200));

  // Find related articles (random 3 from same list, excluding current)
  const relatedArticles = allArticles
    .filter(a => a.id !== article.id && (a.contentType || 'article') === 'article')
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  const getFontSizeClass = () => {
    switch(fontSize) {
      case 'sm': return 'prose-sm';
      case 'lg': return 'prose-xl';
      default: return 'prose-lg';
    }
  };

  const handleSummaryToggle = async () => {
    if (!isSummaryOpen && !article.summary && !generatedSummary) {
      setIsSummaryOpen(true);
      setIsGeneratingSummary(true);
      try {
        const summary = await summarizeArticle(plainContent || article.title);
        if (summary) {
          setGeneratedSummary(summary);
        } else {
          setGeneratedSummary("მოკლე შინაარსის გენერირება ვერ მოხერხდა.");
        }
      } catch {
        setGeneratedSummary("მოკლე შინაარსის გენერირება ვერ მოხერხდა.");
      } finally {
        setIsGeneratingSummary(false);
      }
    } else {
      setIsSummaryOpen((open) => !open);
    }
  };

  const finalSummary = article.summary || generatedSummary;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareTitle = encodeURIComponent(article.title);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setShareCopied(false);
    }
  };

  const handleCopyAndOpen = async (url: string) => {
    await handleCopyLink();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const bookmarked = isBookmarked(article.id);
  const handleArticleReaction = (type: 'like' | 'dislike') => {
    if (!currentUser) {
      onLoginRequest();
      return;
    }

    setArticleReactions((prev) => {
      const next = { ...prev, [type]: prev[type] + 1 };
      localStorage.setItem(`paqtebi_article_reactions_${article.id}`, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f19] text-news-black dark:text-gray-100 animate-in fade-in duration-300 transition-colors duration-300">
      {/* Sticky Navigation for Back */}
      <div className="sticky top-0 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-sm z-20 border-b border-gray-100 dark:border-gray-800 px-4 py-4 md:px-8 max-w-5xl mx-auto w-full flex items-center justify-between shadow-sm transition-colors duration-300">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-news-black dark:hover:text-white transition-colors group"
          aria-label="მთავარ გვერდზე დაბრუნება"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
          <span className="font-medium">უკან მთავარზე</span>
        </button>
        
        {/* Actions */}
        <div className="flex items-center gap-4">
             <button 
                onClick={() => toggleBookmark(article.id)}
                className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full border transition-all ${bookmarked ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/55 text-red-500' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
                aria-label={bookmarked ? "შენახულებიდან ამოშლა" : "სტატიის შენახვა"}
             >
                <Heart size={16} fill={bookmarked ? "currentColor" : "none"} />
                <span className="hidden sm:inline">{bookmarked ? 'შენახულია' : 'შენახვა'}</span>
             </button>

            {/* Font Size Controls */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-sm p-1 transition-colors duration-300">
            <button 
                onClick={() => setFontSize('sm')}
                className={`p-1.5 rounded-sm transition-colors ${fontSize === 'sm' ? 'bg-white dark:bg-gray-700 shadow-sm text-news-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-news-black dark:hover:text-white'}`}
                title="პატარა შრიფტი"
                aria-label="პატარა შრიფტი"
            >
                <ZoomOut size={16} />
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium px-1" aria-hidden="true">A</span>
            <button 
                onClick={() => setFontSize('lg')}
                className={`p-1.5 rounded-sm transition-colors ${fontSize === 'lg' ? 'bg-white dark:bg-gray-700 shadow-sm text-news-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-news-black dark:hover:text-white'}`}
                title="დიდი შრიფტი"
                aria-label="დიდი შრიფტი"
            >
                <ZoomIn size={16} />
            </button>
            </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 md:px-0 py-8 pb-24">
        {/* Article Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 text-sm text-news-accent font-medium mb-4 uppercase tracking-wider">
            <span className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-sm"><Tag size={14} aria-hidden="true" /> {article.category}</span>
            <button
              onClick={handleSummaryToggle}
              aria-expanded={isSummaryOpen}
              className="article-summary-toggle flex items-center gap-1.5 text-xs font-bold text-news-accent hover:text-news-accent/80 transition-colors group ml-2"
              aria-label="მოკლე შინაარსი"
              title="მოკლე შინაარსი"
            >
              <BookOpen size={14} className="group-hover:scale-110 transition-transform" />
              <span>მოკლე შინაარსი</span>
              {isSummaryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-news-black dark:text-white leading-snug tracking-normal mb-6 font-serif">
            {article.title}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-gray-800 pb-6 gap-4">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center transition-colors">
                        <User size={16} className="text-gray-600 dark:text-gray-400" aria-hidden="true" />
                    </div>
                    <span className="font-medium text-news-black dark:text-white">{article.author}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={16} aria-hidden="true" />
                    <span>{formatDayMonthYear(article.date)}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 mb-8 overflow-hidden rounded-sm shadow-sm group">
          <LazyImage
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full"
          />
        </div>

        {/* AI Summary Display */}
        {isSummaryOpen && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className={`border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-r-sm transition-all duration-300 overflow-hidden ${isSummaryOpen ? 'max-h-[1000px]' : 'max-h-12'}`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    <Sparkles size={16} />
                    <span>AI მოკლე შინაარსი</span>
                  </div>
                  <button
                    onClick={() => setIsSummaryOpen(false)}
                    className="p-1 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded-full transition-colors"
                    title="დაკეტვა"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
                
                {isGeneratingSummary ? (
                  <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 text-sm py-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>AI აანალიზებს ტექსტს...</span>
                  </div>
                ) : (
                  <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed space-y-2 whitespace-pre-wrap">
                    {finalSummary}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className={`article-body max-w-none transition-all duration-300 ${getFontSizeClass()}`}
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />

        <div className="mt-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-extrabold text-news-black dark:text-white">
                <Share2 size={17} className="text-news-accent" />
                გაზიარება
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">გაუზიარეთ სტატია მეგობრებს ან შეინახეთ ბმული.</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCopyAndOpen(`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`)}
                className="w-11 h-11 flex items-center justify-center bg-[#1877F2] text-white rounded-full hover:bg-blue-700 transition-all hover:-translate-y-1 shadow-sm hover:shadow-md"
                title="Facebook"
                aria-label="გაზიარება Facebook-ზე"
              >
                <Facebook size={18} aria-hidden="true" />
              </button>
              <button
                onClick={() => handleCopyAndOpen(`https://twitter.com/intent/tweet?url=${encodedShareUrl}&text=${encodedShareTitle}`)}
                className="w-11 h-11 flex items-center justify-center bg-[#1DA1F2] text-white rounded-full hover:bg-sky-600 transition-all hover:-translate-y-1 shadow-sm hover:shadow-md"
                title="Twitter"
                aria-label="გაზიარება Twitter-ზე"
              >
                <Twitter size={18} aria-hidden="true" />
              </button>
              <button
                onClick={handleCopyLink}
                className="w-11 h-11 flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-all hover:-translate-y-1 shadow-sm hover:shadow-md"
                title="ბმულის კოპირება"
                aria-label="ბმულის კოპირება"
              >
                {shareCopied ? <span className="text-xs font-bold text-green-600 dark:text-green-500 tracking-tight">Copied</span> : <LinkIcon size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-news-black dark:text-white">როგორ შეაფასებდით სტატიას?</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">რეაქციის დასატოვებლად საჭიროა შესვლა ან რეგისტრაცია.</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleArticleReaction('like')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-green-300 hover:text-green-700 dark:hover:text-green-400 transition-colors text-sm font-bold"
              >
                <ThumbsUp size={16} />
                <span>{articleReactions.like}</span>
              </button>
              <button
                onClick={() => handleArticleReaction('dislike')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-red-300 hover:text-news-accent transition-colors text-sm font-bold"
              >
                <ThumbsDown size={16} />
                <span>{articleReactions.dislike}</span>
              </button>
              <a
                href="#comments"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-news-accent text-white hover:bg-red-700 transition-colors text-sm font-bold"
              >
                <MessageCircle size={16} />
                <span>კომენტარები</span>
              </a>
            </div>
          </div>
        </div>

        {/* Related News Section */}
        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-8 border-t-4 border-news-black dark:border-gray-850">
            <h3 className="text-2xl font-bold mb-6 text-news-black dark:text-white">ასევე დაგაინტერესებთ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map(related => (
                <article 
                  key={related.id} 
                  className="group cursor-pointer flex flex-col"
                  onClick={() => onNavigateToArticle(related)}
                >
                  <div className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 overflow-hidden rounded-sm mb-3">
                    <LazyImage src={related.imageUrl} alt={related.title} className="w-full h-full transform group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="text-[10px] text-news-accent font-bold uppercase mb-1">{related.category}</div>
                  <h4 className="font-bold text-news-black dark:text-white leading-snug group-hover:underline decoration-2 underline-offset-4 transition-colors">
                    {related.title}
                  </h4>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Comment System */}
        <CommentSection 
          articleId={article.id} 
          articleTitle={article.title}
          currentUser={currentUser}
          onLoginRequest={onLoginRequest}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  );
};
