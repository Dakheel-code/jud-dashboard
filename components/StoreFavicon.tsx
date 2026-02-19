'use client';

import { memo, useState } from 'react';

interface StoreFaviconProps {
  storeUrl: string;
  alt?: string;
  size?: number;
  className?: string;
}

function buildFaviconUrl(domain: string, sz: number) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`;
}

function cleanDomain(url: string) {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
}

const StoreFavicon = memo(function StoreFavicon({ storeUrl, alt, size = 40, className = '' }: StoreFaviconProps) {
  const faviconSize = size > 32 ? 64 : 32;
  const domain = cleanDomain(storeUrl);
  const [fallbackStage, setFallbackStage] = useState(0);

  const sources = [
    buildFaviconUrl(domain, faviconSize),
    `https://${domain}/favicon.ico`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    '/logo.png',
  ];

  return (
    <img
      src={sources[fallbackStage]}
      alt={alt || storeUrl}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      onError={() => {
        if (fallbackStage < sources.length - 1) {
          setFallbackStage(s => s + 1);
        }
      }}
    />
  );
});

export default StoreFavicon;
