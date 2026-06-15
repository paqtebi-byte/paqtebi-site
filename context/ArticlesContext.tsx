import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useArticles } from '../hooks/useArticles';

type ArticlesContextType = ReturnType<typeof useArticles>;

const ArticlesContext = createContext<ArticlesContextType | undefined>(undefined);

export const ArticlesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const articles = useArticles();

  useEffect(() => {
    articles.loadAllNews();
  }, [articles.loadAllNews]);

  return (
    <ArticlesContext.Provider value={articles}>
      {children}
    </ArticlesContext.Provider>
  );
};

export const useArticlesContext = () => {
  const context = useContext(ArticlesContext);
  if (context === undefined) {
    throw new Error('useArticlesContext must be used within an ArticlesProvider');
  }
  return context;
};
