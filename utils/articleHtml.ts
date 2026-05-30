/**
 * Removes pasted/CMS styling so article text follows site theme only.
 */
export function normalizeArticleHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/\sstyle=(["'])[\s\S]*?\1/gi, '')
    .replace(/\sstyle=[^\s>]+/gi, '')
    .replace(/\sclass=(["'])([^"']*)\1/gi, (_match, quote: string, classes: string) => {
      const cleaned = classes
        .split(/\s+/)
        .filter((token) => token && !/^ql-(?:bg|color)-/i.test(token))
        .join(' ');

      return cleaned ? ` class=${quote}${cleaned}${quote}` : '';
    })
    .replace(/\sbgcolor=(["'])[^"']*\1/gi, '')
    .replace(/\sbgcolor=[^\s>]+/gi, '')
    .replace(/<mark(\s[^>]*)?>/gi, '<span>')
    .replace(/<\/mark>/gi, '</span>');
}

/** Plain text for cards and previews (no inline styling). */
export function stripHtmlToText(html: string): string {
  if (!html) return '';

  return normalizeArticleHtml(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when summary/content still carries pasted markup. */
export function containsHtmlMarkup(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
