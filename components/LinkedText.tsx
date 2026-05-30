import React from 'react';

interface LinkedTextProps {
  text: string;
  linkClassName?: string;
}

const urlPattern = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const trailingPunctuation = /[.,!?;:)]+$/;

const normalizeHref = (url: string) => {
  const cleanUrl = url.replace(/&amp;/g, '&');
  return cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
};

export const LinkedText: React.FC<LinkedTextProps> = ({ text, linkClassName = '' }) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const rawUrl = match[0];
    const startIndex = match.index ?? 0;
    const punctuation = rawUrl.match(trailingPunctuation)?.[0] || '';
    const url = punctuation ? rawUrl.slice(0, -punctuation.length) : rawUrl;

    if (startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, startIndex));
    }

    parts.push(
      <a
        key={`${url}-${startIndex}`}
        href={normalizeHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        {url}
      </a>
    );

    if (punctuation) {
      parts.push(punctuation);
    }

    lastIndex = startIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length ? parts : text}</>;
};
