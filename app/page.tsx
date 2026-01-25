'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBranding } from '@/contexts/BrandingContext';

export default function Home() {
  const router = useRouter();
  const { branding } = useBranding();

  useEffect(() => {
    router.replace('/admin/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      </div>
      <div className="text-center relative z-10">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 border-l-fuchsia-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          <div className="absolute inset-4 flex items-center justify-center">
            <img 
              src={branding.logo || '/logo.png'} 
              alt="Loading" 
              className="w-full h-full object-contain animate-pulse"
              style={{ filter: 'drop-shadow(0 0 15px rgba(167, 139, 250, 0.8))' }}
            />
          </div>
        </div>
        <div className="text-xl text-white font-semibold">جاري التحويل...</div>
      </div>
    </div>
  );
}
