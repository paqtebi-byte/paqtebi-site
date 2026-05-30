import { useEffect } from "react";

interface MetaTagsConfig {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

export const useDynamicMetaTags = (config: MetaTagsConfig) => {
  useEffect(() => {
    // Update title
    if (config.title) {
      document.title = config.title;
    }

    // Update or create description meta tag
    let descriptionTag = document.querySelector('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }
    if (config.description) {
      descriptionTag.setAttribute("content", config.description);
    }

    // Update or create keywords meta tag
    let keywordsTag = document.querySelector('meta[name="keywords"]');
    if (!keywordsTag) {
      keywordsTag = document.createElement("meta");
      keywordsTag.setAttribute("name", "keywords");
      document.head.appendChild(keywordsTag);
    }
    if (config.keywords) {
      keywordsTag.setAttribute("content", config.keywords);
    }

    // Update or create canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    if (config.canonicalUrl) {
      canonicalLink.setAttribute("href", config.canonicalUrl);
    }

    // Update or create Open Graph tags
    const ogTags = [
      { property: "og:title", value: config.ogTitle },
      { property: "og:description", value: config.ogDescription },
      { property: "og:type", value: config.ogType },
      { property: "og:image", value: config.ogImage },
      { property: "og:url", value: config.ogUrl },
    ];

    ogTags.forEach((tag) => {
      if (tag.value) {
        let ogTag = document.querySelector(`meta[property="${tag.property}"]`);
        if (!ogTag) {
          ogTag = document.createElement("meta");
          ogTag.setAttribute("property", tag.property);
          document.head.appendChild(ogTag);
        }
        ogTag.setAttribute("content", tag.value);
      }
    });

    // Update or create Twitter Card tags
    const twitterTags = [
      { name: "twitter:card", value: config.twitterCard },
      { name: "twitter:title", value: config.twitterTitle },
      { name: "twitter:description", value: config.twitterDescription },
      { name: "twitter:image", value: config.twitterImage },
    ];

    twitterTags.forEach((tag) => {
      if (tag.value) {
        let twitterTag = document.querySelector(`meta[name="${tag.name}"]`);
        if (!twitterTag) {
          twitterTag = document.createElement("meta");
          twitterTag.setAttribute("name", tag.name);
          document.head.appendChild(twitterTag);
        }
        twitterTag.setAttribute("content", tag.value);
      }
    });

    // Cleanup function to reset to defaults when component unmounts
    return () => {
      // Reset title to default if needed
      // document.title = 'Paqtebi - განახლებული საქართველოს და მსოფლიოს სიახლეები';
    };
  }, [
    config.title,
    config.description,
    config.keywords,
    config.canonicalUrl,
    config.ogTitle,
    config.ogDescription,
    config.ogType,
    config.ogImage,
    config.ogUrl,
    config.twitterCard,
    config.twitterTitle,
    config.twitterDescription,
    config.twitterImage,
  ]);
};
