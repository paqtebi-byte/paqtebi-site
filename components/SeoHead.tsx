import React from "react";
import { Helmet } from "react-helmet";

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  url?: string;
  image?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

const SeoHead: React.FC<SeoHeadProps> = ({
  title = "Paqtebi - განახლებული საქართველოს და მსოფლიოს სიახლეები",
  description = "ობიექტური და ოპერატიული ინფორმაცია მსოფლიოს ნებისმიერი წერტილიდან.",
  keywords = [
    "სიახლეები",
    "საქართველო",
    "პოლიტიკა",
    "ეკონომიკა",
    "საზოგადოება",
  ],
  url = typeof window !== "undefined"
    ? window.location.href
    : "https://paqtebi.ge",
  image = "https://paqtebi.ge/logo.png", // Replace with actual logo
  type = "website",
  author = "Paqtebi",
  publishedTime,
  modifiedTime,
  section,
  tags,
}) => {
  const fullKeywords = [
    ...keywords,
    "პაქტები",
    "საქართველოს სიახლეები",
    "ქართული ამბები",
  ];

  return (
    <Helmet>
      {/* Standard meta tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={fullKeywords.join(", ")} />
      <meta name="author" content={author} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content="index, follow" />
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Paqtebi" />
      {section && <meta property="article:section" content={section} />}
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {tags?.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@paqtebi" />
      <meta name="twitter:creator" content="@paqtebi" />
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      {/* Additional SEO tags */}
      <meta name="theme-color" content="#dc2626" /> {/* Georgian red color */}
      <meta name="application-name" content="Paqtebi" />
      <meta name="msapplication-TileColor" content="#dc2626" />
    </Helmet>
  );
};

export default SeoHead;
