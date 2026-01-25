'use client';

import { useBranding } from '@/contexts/BrandingContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export default function Logo({ className = '', size = 'md', showName = false }: LogoProps) {
  const { branding, loading } = useBranding();

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} bg-purple-900/50 rounded-lg animate-pulse ${className}`} />
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={branding.logo || '/logo.png'} 
        alt={branding.companyName || 'Logo'} 
        className={`object-contain ${sizeClasses[size]}`}
      />
      {showName && (
        <span className="text-white font-bold text-lg">
          {branding.companyName || 'جود'}
        </span>
      )}
    </div>
  );
}
