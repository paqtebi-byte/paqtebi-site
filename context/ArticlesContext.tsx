import React, { createContext, useContext, useEffect } from 'react';
import { useArticles } from '../hooks/useArticles';

const ArticlesContext = createContext<ReturnType<typeof useArticles> | null>(null);

/** Fetches articles once and shares state across all components */
export const ArticlesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const articles = useArticles();

  useEffect(() => {
    articles.loadAllNews();
  }, []);

  return <ArticlesContext.Provider value={articles}>{children}</ArticlesContext.Provider>;
};

export const useArticlesContext = () => {
  const ctx = useContext(ArticlesContext);
  if (!ctx) throw new Error('useArticlesContext must be used within ArticlesProvider');
  return ctx;
};
