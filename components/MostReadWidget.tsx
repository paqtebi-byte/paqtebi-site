import React, { useMemo, useState, useEffect } from 'react';
import { BarChart3, Clock, Eye, TrendingUp } from 'lucide-react';
import { Article } from '../types';
import { LazyImage } from './LazyImage';

interface MostReadWidgetProps {
  articles?: Article[];
  onArticleClick?: (article: Article) => void;
}

import { getArticleViewCount } from '../utils/viewUtils';

export const MostReadWidget: React.FC<MostReadWidgetProps> = ({ articles = [], onArticleClick }) => {
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const handleViewTracked = () => {
      setRefreshTick(t => t + 1);
    };
    window.addEventListener('paqtebi-article-view-tracked', handleViewTracked);
    return () => {
      window.removeEventListener('paqtebi-article-view-tracked', handleViewTracked);
    };
  }, []);

  const rankedArticles = useMemo(() => {
    return articles
      .filter((article) => (article.contentType || 'article') === 'article' && article.layout !== 'hero')
      .map((article) => ({
        article,
        views: getArticleViewCount(article.id),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [articles, refreshTick]);

  if (rankedArticles.length === 0) return null;

  const [topItem, ...otherItems] = rankedArticles;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="border-b border-gray-100 bg-gradient-to-br from-gray-50 via-white to-red-50 px-5 py-4 dark:border-gray-800 dark:from-gray-950 dark:via-gray-950 dark:to-red-950/20">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-news-accent text-white shadow-sm shadow-red-500/30">
            <TrendingUp size={16} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-news-accent">24 საათი</p>
            <h3 className="section-title text-sm">ყველაზე წაკითხული</h3>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onArticleClick?.(topItem.article)}
        className="group block w-full p-4 text-left"
      >
        <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900">
          <LazyImage
            src={topItem.article.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800&auto=format&fit=crop"}
            alt={topItem.article.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-news-accent px-2.5 py-1 text-[10px] font-black text-white">
            #1
          </span>
        </div>
        <h4 className="line-clamp-2 text-base font-black leading-snug text-gray-950 transition-colors group-hover:text-news-accent dark:text-white">
          {topItem.article.title}
        </h4>
        <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-gray-400">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {topItem.views} ნახვა
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            24სთ
          </span>
        </div>
      </button>

      <div className="border-t border-gray-100 px-4 pb-4 dark:border-gray-800">
        {otherItems.map(({ article, views }, index) => (
          <button
            key={article.id}
            type="button"
            onClick={() => onArticleClick?.(article)}
            className="group flex w-full items-center gap-3 border-b border-gray-100 py-3 text-left last:border-b-0 dark:border-gray-800"
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-black text-gray-500 dark:bg-gray-900 dark:text-gray-300">
              {index + 2}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-bold leading-snug text-gray-800 transition-colors group-hover:text-news-accent dark:text-gray-100">
                {article.title}
              </span>
              <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                <BarChart3 size={11} />
                {views} ნახვა
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
