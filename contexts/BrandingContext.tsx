'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BrandingSettings {
  companyName: string;
  companyNameEn: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
}

interface BrandingContextType {
  branding: BrandingSettings;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: BrandingSettings = {
  companyName: '',
  companyNameEn: '',
  logo: '',
  favicon: '',
  primaryColor: '#8b5cf6',
  secondaryColor: '#7c3aed',
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: true,
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const response = await fetch('/api/admin/settings/branding');
      const data = await response.json();
      if (data.branding) {
        setBranding(data.branding);
        // تحديث favicon ديناميكياً
        updateFavicon(data.branding.favicon);
        // تحديث عنوان الصفحة
        updateDocumentTitle(data.branding.companyName);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFavicon = (faviconUrl: string) => {
    if (typeof document !== 'undefined' && typeof window !== 'undefined' && faviconUrl) {
      try {
        // تحديث الأيقونات الموجودة بدلاً من إزالتها
        const existingLinks = document.querySelectorAll("link[rel*='icon']");
        if (existingLinks.length > 0) {
          existingLinks.forEach(link => {
            (link as HTMLLinkElement).href = faviconUrl;
          });
        } else {
          // إضافة أيقونة جديدة إذا لم تكن موجودة
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = faviconUrl;
          if (faviconUrl.includes('base64')) {
            link.type = faviconUrl.includes('png') ? 'image/png' : 'image/x-icon';
          } else if (faviconUrl.endsWith('.gif')) {
            link.type = 'image/gif';
          } else if (faviconUrl.endsWith('.png')) {
            link.type = 'image/png';
          }
          document.head.appendChild(link);
        }
      } catch (error) {
        console.error('Error updating favicon:', error);
      }
    }
  };

  const updateDocumentTitle = (companyName: string) => {
    if (typeof document !== 'undefined' && companyName) {
      const currentTitle = document.title;
      // استبدال اسم الشركة القديم بالجديد
      const oldNames = ['جود', 'JUD', 'Jud', 'زد', 'zid', 'Zid'];
      let newTitle = currentTitle;
      let replaced = false;
      
      oldNames.forEach(oldName => {
        if (newTitle.includes(oldName) && oldName !== companyName) {
          newTitle = newTitle.replace(new RegExp(oldName, 'g'), companyName);
          replaced = true;
        }
      });
      
      // إذا لم يتم العثور على اسم قديم، استبدل ما بعد | أو أضف اسم الشركة
      if (!replaced && !currentTitle.includes(companyName)) {
        if (currentTitle.includes('|')) {
          newTitle = currentTitle.replace(/\|\s*[^|]*$/, `| ${companyName}`);
        } else {
          newTitle = `${currentTitle} | ${companyName}`;
        }
      }
      
      if (newTitle !== currentTitle) {
        document.title = newTitle;
      }
    }
  };

  useEffect(() => {
    fetchBranding();
    
    // الاستماع لتحديثات الإعدادات
    const handleBrandingUpdate = () => {
      fetchBranding();
    };
    window.addEventListener('branding-updated', handleBrandingUpdate);
    
    return () => {
      window.removeEventListener('branding-updated', handleBrandingUpdate);
    };
  }, []);

  // تحديث العنوان والأيقونة عند تحميل البيانات
  useEffect(() => {
    if (!loading && branding.companyName) {
      // تحديث فوري
      updateDocumentTitle(branding.companyName);
      updateFavicon(branding.favicon);
    }
  }, [loading, branding.companyName, branding.favicon]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}

export default BrandingContext;
