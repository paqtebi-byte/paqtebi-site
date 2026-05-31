import DOMPurify from 'dompurify';

const TRUSTED_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
  'www.facebook.com',
  'facebook.com',
]);

function isTrustedEmbedUrl(value: string | null): boolean {
  if (!value) return false;

  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) && TRUSTED_EMBED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function hardenSanitizedHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || /^(?:javascript|data):/i.test(href)) {
      link.removeAttribute('href');
    }

    if (link.getAttribute('target') === '_blank') {
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  template.content.querySelectorAll('iframe').forEach((iframe) => {
    if (!isTrustedEmbedUrl(iframe.getAttribute('src'))) {
      iframe.remove();
    }
  });

  return template.innerHTML;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Removes pasted/CMS styling so article text follows site theme only.
 */
export function normalizeArticleHtml(html: string): string {
  if (!html) return '';

  const normalizedHtml = html
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

  // Perform robust XSS sanitization, allowing basic formatting and media but stripping scripts
  try {
    const sanitizedHtml = DOMPurify.sanitize(normalizedHtml, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'img', 'video', 'source', 'iframe', 'blockquote', 'pre', 'code'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel', 'controls', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      FORBID_ATTR: ['style'],
    });
    return hardenSanitizedHtml(sanitizedHtml);
  } catch (error) {
    return escapeHtml(html);
  }
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
