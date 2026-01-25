'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { BrandingProvider } from '@/contexts/BrandingContext';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <BrandingProvider>
        {children}
      </BrandingProvider>
    </SessionProvider>
  );
}
