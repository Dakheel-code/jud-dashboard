'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';
import { useBranding } from '@/contexts/BrandingContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'urgent' | 'scheduled' | 'conditional';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
  creator?: { id: string; name: string; avatar?: string };
}

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  normal: { label: 'عادي', color: 'bg-blue-500/20 text-blue-400', icon: '📋' },
  urgent: { label: 'عاجل', color: 'bg-red-500/20 text-red-400', icon: '🚨' },
  scheduled: { label: 'مجدول', color: 'bg-yellow-500/20 text-yellow-400', icon: '⏰' },
  conditional: { label: 'مشروط', color: 'bg-purple-500/20 text-purple-400', icon: '⚙️' }
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-l-gray-400',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  critical: 'border-l-red-500'
};

function AnnouncementsListContent() {
  const { branding } = useBranding();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'urgent'>('all');

  const fetchAnnouncements = useCallback(async (userId: string) => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/announcements/my?user_id=${userId}&t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      fetchAnnouncements(user.id);
    }
  }, [fetchAnnouncements]);

  const markAsRead = useCallback(async (announcementId: string) => {
    if (!currentUser) return;

    try {
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ user_id: currentUser.id })
      });

      // Refetch to get accurate state
      await fetchAnnouncements(currentUser.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [currentUser, fetchAnnouncements]);

  const openAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    if (!announcement.read_at) {
      markAsRead(announcement.id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (filter === 'unread') return !a.read_at;
    if (filter === 'read') return !!a.read_at;
    if (filter === 'urgent') return a.type === 'urgent';
    return true;
  });

  const unreadCount = announcements.filter(a => !a.read_at).length;

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
<div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>التعاميم</h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">
                {unreadCount > 0 ? `لديك ${unreadCount} تعميم غير مقروء` : 'جميع التعاميم مقروءة'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link href="/admin/announcements" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-orange-500/20 text-orange-300 rounded-xl border border-orange-500/30 hover:bg-orange-500/30 transition-all text-sm sm:text-base flex-1 sm:flex-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden xs:inline">إدارة التعاميم</span>
              <span className="xs:hidden">إدارة</span>
            </Link>
            <Link href="/admin" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all text-sm sm:text-base flex-1 sm:flex-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
              <span className="hidden xs:inline">لوحة التحكم</span>
              <span className="xs:hidden">الرئيسية</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl transition-all ${filter === 'all' ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'}`}
          >
            الكل ({announcements.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl transition-all ${filter === 'unread' ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'}`}
          >
            غير مقروء ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-4 py-2 rounded-xl transition-all ${filter === 'urgent' ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'}`}
          >
            🚨 عاجل ({announcements.filter(a => a.type === 'urgent').length})
          </button>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 text-center">
              <p className="text-purple-400">جاري التحميل...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-purple-400">لا توجد تعاميم</p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => openAnnouncement(announcement)}
                className={`bg-white/5 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden cursor-pointer hover:bg-purple-900/30 transition-all border-l-4 ${PRIORITY_COLORS[announcement.priority]} ${!announcement.read_at ? 'ring-2 ring-purple-500/30' : ''}`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {!announcement.read_at && (
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        )}
                        <h3 className={`font-bold text-lg ${!announcement.read_at ? 'text-white' : 'text-purple-200'}`}>
                          {announcement.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${TYPE_LABELS[announcement.type]?.color}`}>
                          {TYPE_LABELS[announcement.type]?.icon} {TYPE_LABELS[announcement.type]?.label}
                        </span>
                      </div>
                      <p className="text-purple-300 line-clamp-2">{announcement.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-500/10">
                    <div className="flex items-center gap-2 text-purple-400 text-sm">
                      {announcement.creator?.avatar ? (
                        <img src={announcement.creator.avatar} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-xs">
                          {announcement.creator?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span>{announcement.creator?.name || 'الإدارة'}</span>
                    </div>
                    <span className="text-purple-500 text-sm">
                      {formatDate(announcement.sent_at || announcement.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Announcement Detail Modal */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className={`p-4 border-b border-purple-500/20 ${selectedAnnouncement.type === 'urgent' ? 'bg-red-500/10' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${TYPE_LABELS[selectedAnnouncement.type]?.color}`}>
                      {TYPE_LABELS[selectedAnnouncement.type]?.icon} {TYPE_LABELS[selectedAnnouncement.type]?.label}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">{selectedAnnouncement.title}</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-purple-200 whitespace-pre-wrap leading-relaxed">{selectedAnnouncement.content}</p>
                </div>
              </div>

              <div className="p-4 border-t border-purple-500/20 bg-purple-900/20">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-purple-400">
                    {selectedAnnouncement.creator?.avatar ? (
                      <img src={selectedAnnouncement.creator.avatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center">
                        {selectedAnnouncement.creator?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span>{selectedAnnouncement.creator?.name || 'الإدارة'}</span>
                  </div>
                  <span className="text-purple-500">
                    {formatDate(selectedAnnouncement.sent_at || selectedAnnouncement.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnnouncementsListPage() {
  return (
    <AdminAuth>
      <AnnouncementsListContent />
    </AdminAuth>
  );
}
