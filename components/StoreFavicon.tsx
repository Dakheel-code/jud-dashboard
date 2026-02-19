'use client';

import { memo, useState } from 'react';

interface StoreFaviconProps {
  storeUrl:   string;
  logoUrl?:   string | null;  // logo_url من DB — المصدر الوحيد المسموح
  alt?:       string;
  size?:      number;
  className?: string;
}

/** Placeholder — حرف أول من اسم المتجر أو أيقونة */
function Placeholder({ size, className, label }: { size: number; className: string; label?: string }) {
  const initial = label?.trim()?.[0]?.toUpperCase() || '?';
  return (
    <div
      className={`flex items-center justify-center bg-purple-900/40 rounded-lg flex-shrink-0 ${className}`}
      style={{ width: size, height: size, minWidth: size }}
      title={label}
    >
      <span className="text-purple-400/80 font-bold select-none" style={{ fontSize: size * 0.4 }}>
        {initial}
      </span>
    </div>
  );
}

/** Skeleton — يظهر أثناء تحميل الصورة لمنع layout shift */
function Skeleton({ size, className }: { size: number; className: string }) {
  return (
    <div
      className={`bg-purple-900/30 rounded-lg flex-shrink-0 animate-pulse ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    />
  );
}

const StoreFavicon = memo(function StoreFavicon({
  storeUrl,
  logoUrl,
  alt,
  size = 40,
  className = '',
}: StoreFaviconProps) {
  const [loaded,   setLoaded]   = useState(false);
  const [imgError, setImgError] = useState(false);

  // لا يوجد logo_url أو فشل التحميل → placeholder
  if (!logoUrl || imgError) {
    return <Placeholder size={size} className={className} label={alt || storeUrl} />;
  }

  return (
    // حاوية بحجم ثابت تمنع layout shift
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size, minWidth: size }}>
      {/* Skeleton يظهر حتى تكتمل الصورة */}
      {!loaded && <Skeleton size={size} className="absolute inset-0" />}
      <img
        src={logoUrl}
        alt={alt || storeUrl}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setImgError(true)}
        style={{
          width:      size,
          height:     size,
          objectFit:  'cover',
          opacity:    loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
    </div>
  );
});

export default StoreFavicon;
