'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminBottomNav from '@/components/AdminBottomNav';
import { useBranding } from '@/contexts/BrandingContext';

export default function AnnouncementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { branding } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0118] flex">
      {/* Sidebar */}
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Main Content */}
      <div className="flex-1 lg:mr-0">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-[#0a0118]/95 backdrop-blur-xl border-b border-purple-500/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-8 h-8 object-contain" />
              <span className="text-white font-bold">{branding.companyName || 'جود'}</span>
            </div>
            <div className="w-10"></div>
          </div>
        </div>
        
        {/* Page Content */}
        <main className="min-h-screen">
          {children}
        </main>
        
        {/* Bottom Navigation for Mobile */}
        <AdminBottomNav />
        
        {/* Spacer for bottom nav */}
        <div className="h-20 lg:hidden"></div>
      </div>
    </div>
  );
}
