const decodeHtmlEntities = (value: string): string => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#039;|&#39;/gi, "'")
  .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)));

const normalizeText = (value: string): string => decodeHtmlEntities(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

/**
 * Keep a duplicated lead paragraph aligned when an editor corrects the summary.
 * Unrelated article introductions are deliberately left untouched.
 */
export const syncLeadParagraphWithSummary = (
  contentHtml: string,
  previousSummary: string | undefined,
  nextSummary: string,
): string => {
  if (!contentHtml || !previousSummary || previousSummary === nextSummary) return contentHtml;

  const leadMatch = contentHtml.match(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/i);
  if (!leadMatch || normalizeText(leadMatch[2]) !== normalizeText(previousSummary)) {
    return contentHtml;
  }

  let insertedSummary = false;
  const synchronizedLead = leadMatch[2].replace(
    /(^|>)([^<]*)(?=<|$)/g,
    (fullMatch, prefix: string, text: string) => {
      if (!text.trim()) return fullMatch;
      if (insertedSummary) return prefix;

      insertedSummary = true;
      return `${prefix}${escapeHtml(nextSummary)}`;
    },
  );

  if (!insertedSummary) return contentHtml;

  const fullLead = leadMatch[0];
  const openingTagEnd = fullLead.indexOf('>') + 1;
  const nextLead = `${fullLead.slice(0, openingTagEnd)}${synchronizedLead}</p>`;
  return contentHtml.replace(fullLead, nextLead);
};
