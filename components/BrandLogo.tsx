import React from 'react';

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  imageClassName = 'h-full w-full',
}) => (
  <div className={`flex items-center justify-center ${className}`}>
    <img
      src="/assets/paqtebi-logo.png"
      alt="Paqtebi"
      className={`block object-contain ${imageClassName}`}
      loading="eager"
      decoding="async"
    />
  </div>
);
