import React from 'react';
import { PlayCircle } from 'lucide-react';
import { Article } from '../types';
import { LazyImage } from './LazyImage';

interface SidebarVideoSectionProps {
  title: string;
  items: Article[];
  onArticleClick?: (article: Article) => void;
}

export const SidebarVideoSection: React.FC<SidebarVideoSectionProps> = ({ title, items, onArticleClick }) => {
  if (items.length === 0) return null;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
        <PlayCircle size={16} className="text-news-accent" />
        <h3 className="section-title text-sm">{title}</h3>
      </div>
      <div className="p-4 space-y-4">
        {items.map((video) => (
          <div key={video.id} className="group cursor-pointer" onClick={() => onArticleClick && onArticleClick(video)}>
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2">
              <LazyImage
                src={video.videoThumbnailUrl || video.imageUrl}
                alt={video.title}
                className="w-full h-full transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center pl-1 shadow-lg group-hover:scale-110 transition-transform">
                  <PlayCircle size={20} className="text-news-accent" />
                </div>
              </div>
            </div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-news-accent transition-colors leading-snug">
              {video.title}
            </h4>
          </div>
        ))}
      </div>
    </div>
  );
};
