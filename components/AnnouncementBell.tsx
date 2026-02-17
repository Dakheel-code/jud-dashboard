'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

interface ApiResponse {
  announcements?: Announcement[];
  data?: { announcements?: Announcement[] };
  unread_count?: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-l-gray-400',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  critical: 'border-l-red-400'
};

export default function AnnouncementBell() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [urgentAnnouncement, setUrgentAnnouncement] = useState<Announcement | null>(null);
  const [acknowledgedUrgentIds, setAcknowledgedUrgentIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const getUserId = useCallback((): string | null => {
    try {
      const userStr = localStorage.getItem('admin_user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user?.id || null;
    } catch {
      return null;
    }
  }, []);

  const formatDate = useCallback((date: string | null | undefined): string => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'الآن';
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      if (days < 7) return `منذ ${days} يوم`;
      return d.toLocaleDateString('ar-SA');
    } catch {
      return '';
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/announcements/my?user_id=${userId}&t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) return;
      
      const data: ApiResponse = await response.json();
      if (!isMountedRef.current) return;

      const announcementsList = data.announcements || data.data?.announcements || [];
      const unread = announcementsList.filter((a: Announcement) => !a.read_at).length;
      
      setAnnouncements(announcementsList);
      setUnreadCount(unread);

      const unreadUrgent = announcementsList.find(
        (a: Announcement) => a.type === 'urgent' && !a.read_at && !acknowledgedUrgentIds.has(a.id)
      );
      
      if (unreadUrgent && !urgentAnnouncement) {
        setUrgentAnnouncement(unreadUrgent);
      }
    } catch (error) {
    }
  }, [getUserId, acknowledgedUrgentIds, urgentAnnouncement]);

  const markSingleAsRead = useCallback(async (announcementId: string): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    try {
      const response = await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ user_id: userId })
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }, [getUserId]);

  const markAsRead = useCallback(async (announcementId: string) => {
    const success = await markSingleAsRead(announcementId);
    if (success && isMountedRef.current) {
      // Refetch to get accurate state from server
      await fetchAnnouncements();
    }
  }, [markSingleAsRead, fetchAnnouncements]);

  const markAllAsRead = useCallback(async () => {
    const unreadAnnouncements = announcements.filter(a => !a.read_at);
    if (unreadAnnouncements.length === 0) return;

    const markPromises = unreadAnnouncements.map(a => markSingleAsRead(a.id));
    await Promise.all(markPromises);

    if (isMountedRef.current) {
      // Refetch to get accurate state from server
      await fetchAnnouncements();
    }
  }, [announcements, markSingleAsRead, fetchAnnouncements]);

  const handleUrgentAcknowledge = useCallback(async () => {
    if (!urgentAnnouncement) return;
    
    const id = urgentAnnouncement.id;
    setAcknowledgedUrgentIds(prev => new Set(prev).add(id));
    setUrgentAnnouncement(null);
    await markAsRead(id);
  }, [urgentAnnouncement, markAsRead]);

  const handleAnnouncementClick = useCallback(async (announcement: Announcement) => {
    if (!announcement.read_at) {
      await markAsRead(announcement.id);
    }
    setIsOpen(false);
    router.push('/announcements');
  }, [markAsRead, router]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAnnouncements();
    
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAnnouncements]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Bell Icon */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-xl transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[99998]" onClick={() => setIsOpen(false)} />
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-72 bg-slate-900 border border-purple-500/30 rounded-xl shadow-2xl z-[99999]">
              <div className="p-3 border-b border-purple-500/20 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">التعاميم</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      markAllAsRead();
                    }}
                    className="text-purple-400 text-xs hover:text-white cursor-pointer"
                  >
                    تعليم الكل كمقروء ({unreadCount})
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto">
                {announcements.length === 0 ? (
                  <div className="p-4 text-center text-purple-400 text-sm">
                    لا توجد تعاميم
                  </div>
                ) : (
                  announcements.slice(0, 10).map((announcement) => (
                    <div
                      key={announcement.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnnouncementClick(announcement);
                      }}
                      className={`p-3 border-b border-purple-500/10 hover:bg-purple-900/20 cursor-pointer transition-all border-l-4 ${PRIORITY_COLORS[announcement.priority] || 'border-l-blue-400'} ${!announcement.read_at ? 'bg-purple-900/30' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${!announcement.read_at ? 'bg-blue-400' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${!announcement.read_at ? 'text-white' : 'text-purple-300'}`}>
                              {announcement.title}
                            </p>
                            {announcement.type === 'urgent' && (
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">عاجل</span>
                            )}
                          </div>
                          <p className="text-purple-400 text-sm truncate mt-1">{announcement.content}</p>
                          <p className="text-purple-500 text-xs mt-2">{formatDate(announcement.sent_at || announcement.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Link
                href="/announcements"
                className="block p-2.5 text-center text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all border-t border-purple-500/20 text-sm"
                onClick={() => setIsOpen(false)}
              >
                عرض جميع التعاميم
              </Link>
            </div>
          </>
        )}
      </div>

    </>
  );
}
