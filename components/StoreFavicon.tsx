'use client';

import { memo } from 'react';

interface StoreFaviconProps {
  storeUrl: string;
  alt?: string;
  size?: number;
  className?: string;
}

const StoreFavicon = memo(function StoreFavicon({ storeUrl, alt, size = 40, className = '' }: StoreFaviconProps) {
  const faviconSize = size > 32 ? 64 : 32;

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${storeUrl}&sz=${faviconSize}`}
      alt={alt || storeUrl}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
    />
  );
});

export default StoreFavicon;
