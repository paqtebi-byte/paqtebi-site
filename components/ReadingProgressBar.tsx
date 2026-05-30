import React, { useState, useEffect } from "react";

interface ReadingProgressBarProps {
  articleElementId?: string; // ID of the element to track scrolling for (defaults to window)
}

const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  articleElementId,
}) => {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const calculateScrollDistance = () => {
      let scrolledPercentage = 0;

      if (articleElementId) {
        // Track scrolling for a specific element
        const element = document.getElementById(articleElementId);
        if (element) {
          const elementRect = element.getBoundingClientRect();
          const scrollTop = element.scrollTop;
          const scrollHeight = element.scrollHeight - element.clientHeight;

          scrolledPercentage = (scrollTop / scrollHeight) * 100;
        }
      } else {
        // Track scrolling for the entire window
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const docHeight =
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight;

        scrolledPercentage = (scrollTop / docHeight) * 100;
      }

      setProgress(Math.min(Math.max(scrolledPercentage, 0), 100));
    };

    // Initial calculation
    calculateScrollDistance();

    // Add scroll event listener
    const scrollTarget = articleElementId
      ? document.getElementById(articleElementId)
      : window;

    scrollTarget?.addEventListener("scroll", calculateScrollDistance, {
      passive: true,
    });

    // Clean up event listener
    return () => {
      scrollTarget?.removeEventListener("scroll", calculateScrollDistance);
    };
  }, [articleElementId]);

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 bg-gray-200 dark:bg-gray-700">
      <div
        className="h-full bg-news-accent transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ReadingProgressBar;
