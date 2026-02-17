'use client';

import Image from 'next/image';
import { useState, memo } from 'react';

interface StoreFaviconProps {
  storeUrl: string;
  alt?: string;
  size?: number;
  className?: string;
}

const StoreFavicon = memo(function StoreFavicon({ storeUrl, alt, size = 40, className = '' }: StoreFaviconProps) {
  const [error, setError] = useState(false);
  const src = error ? '/logo.png' : `https://www.google.com/s2/favicons?domain=${storeUrl}&sz=${size > 32 ? 64 : 32}`;

  return (
    <Image
      src={src}
      alt={alt || storeUrl}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
      unoptimized={error}
    />
  );
});

export default StoreFavicon;
