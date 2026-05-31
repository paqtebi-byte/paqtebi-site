
import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  rootMargin?: string;
  priority?: boolean;
}

const loadedImageSrcs = new Set<string>();

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  rootMargin = '500px 0px',
  priority = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(loading === 'eager' || priority);
  const [isLoaded, setIsLoaded] = useState(() => loadedImageSrcs.has(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(loadedImageSrcs.has(src));
    setHasError(false);
    setShouldLoad(loading === 'eager' || priority);
  }, [src, loading, priority]);

  useEffect(() => {
    if (loading === 'eager' || priority || shouldLoad) return;

    const target = containerRef.current;
    if (!target) return;

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, priority, rootMargin, shouldLoad]);

  if (hasError) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center text-gray-300 ${className}`}>
        <ImageIcon size={24} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-gray-200 ${className}`}>
      {/* Placeholder / Skeleton while loading */}
      <div 
        className={`absolute inset-0 bg-gray-200 animate-pulse transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'}`} 
        aria-hidden="true"
      />
      
      {/* Actual Image */}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          className={
            priority
              ? `w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`
              : `w-full h-full object-cover transition-all duration-700 ${isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-105'}`
          }
          loading={priority ? 'eager' : loading}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => {
            loadedImageSrcs.add(src);
            setIsLoaded(true);
          }}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
};
