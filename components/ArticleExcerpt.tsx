import React from 'react';
import {
  containsHtmlMarkup,
  normalizeArticleHtml,
  stripHtmlToText,
} from '../utils/articleHtml';

interface ArticleExcerptProps {
  summary: string;
  className?: string;
}

/** Renders article summary as clean text in both light and dark mode. */
export const ArticleExcerpt: React.FC<ArticleExcerptProps> = ({
  summary,
  className = '',
}) => {
  if (!summary) return null;

  const baseClass = `article-excerpt text-sm leading-relaxed line-clamp-3 ${className}`;

  if (containsHtmlMarkup(summary)) {
    return (
      <div
        className={baseClass}
        dangerouslySetInnerHTML={{ __html: normalizeArticleHtml(summary) }}
      />
    );
  }

  return <p className={baseClass}>{stripHtmlToText(summary)}</p>;
};
