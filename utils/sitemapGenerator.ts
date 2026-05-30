import { Article } from "../types";

/**
 * Generates a sitemap XML string for the website
 * @param articles - Array of articles to include in the sitemap
 * @returns Sitemap XML string
 */
export const generateSitemap = (articles: Article[]): string => {
  const baseUrl = "https://paqtebi.ge"; // Replace with your actual domain

  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add homepage
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${baseUrl}</loc>\n`;
  sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
  sitemap += `    <changefreq>daily</changefreq>\n`;
  sitemap += `    <priority>1.0</priority>\n`;
  sitemap += `  </url>\n`;

  // Add saved articles page
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${baseUrl}/saved</loc>\n`;
  sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
  sitemap += `    <changefreq>weekly</changefreq>\n`;
  sitemap += `    <priority>0.8</priority>\n`;
  sitemap += `  </url>\n`;

  // Add admin login page
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${baseUrl}/admin/login</loc>\n`;
  sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
  sitemap += `    <changefreq>monthly</changefreq>\n`;
  sitemap += `    <priority>0.3</priority>\n`;
  sitemap += `  </url>\n`;

  // Add individual article pages
  articles.forEach((article) => {
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${baseUrl}/article/${article.id}</loc>\n`;
    sitemap += `    <lastmod>${new Date(article.date).toISOString()}</lastmod>\n`;
    sitemap += `    <changefreq>monthly</changefreq>\n`;
    sitemap += `    <priority>0.7</priority>\n`;
    sitemap += `  </url>\n`;
  });

  sitemap += "</urlset>";

  return sitemap;
};

/**
 * Generates a robots.txt string
 * @returns robots.txt content
 */
export const generateRobotsTxt = (): string => {
  return `User-agent: *
Allow: /

Sitemap: https://paqtebi.ge/sitemap.xml
`;
};
