/**
 * Calculate the estimated reading time for content
 * @param text The text content to analyze
 * @param wordsPerMinute Average words per minute reading speed (default: 200 for Georgian/English)
 * @returns Object containing minutes and a human-readable string
 */
export const calculateReadingTime = (
  text: string,
  wordsPerMinute: number = 200,
): { minutes: number; text: string } => {
  if (!text) {
    return { minutes: 0, text: "0 წუთი" };
  }

  // Remove HTML tags if present and split by spaces to count words
  const cleanText = text.replace(/<[^>]*>/g, " ");
  const wordCount = cleanText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const minutes = Math.ceil(wordCount / wordsPerMinute);

  // Format the time in Georgian
  let timeText = "";
  if (minutes === 1) {
    timeText = "1 წუთი";
  } else if (minutes <= 4) {
    timeText = `${minutes} წუთი`;
  } else {
    timeText = `${minutes} წუთი`;
  }

  return { minutes, text: timeText };
};

/**
 * Get reading time for an article
 * @param title The article title
 * @param content The article content
 * @returns Estimated reading time
 */
export const getArticleReadingTime = (
  title: string,
  content: string,
): { minutes: number; text: string } => {
  // Combine title and content for more accurate calculation
  const combinedText = `${title} ${content}`;
  return calculateReadingTime(combinedText);
};
