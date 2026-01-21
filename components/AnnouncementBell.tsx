'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'urgent' | 'scheduled' | 'conditional';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
  sent_at: string;
  read_at: string | null;
  creator?: { id: string; name: string; avatar: string };
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-l-gray-400',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  critical: 'border-l-red-400'
};

export default function AnnouncementBell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [urgentAnnouncement, setUrgentAnnouncement] = useState<Announcement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnnouncements();
    
    // تحديث كل 30 ثانية
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const userStr = localStorage.getItem('admin_user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const response = await fetch(`/api/announcements/my?user_id=${user.id}`);
      const data = await response.json();
      
      setAnnouncements(data.announcements || []);
      setUnreadCount(data.unread_count || 0);

      // التحقق من وجود تعميم عاجل غير مقروء
      const unreadUrgent = data.announcements?.find(
        (a: Announcement) => a.type === 'urgent' && !a.read_at
      );
      if (unreadUrgent && !urgentAnnouncement) {
        setUrgentAnnouncement(unreadUrgent);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const markAsRead = async (announcementId: string) => {
    try {
      const userStr = localStorage.getItem('admin_user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });

      // تحديث القائمة
      setAnnouncements(prev => 
        prev.map(a => a.id === announcementId ? { ...a, read_at: new Date().toISOString() } : a)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleUrgentAcknowledge = async () => {
    if (urgentAnnouncement) {
      await markAsRead(urgentAnnouncement.id);
      setUrgentAnnouncement(null);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
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
  };

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
          <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
              <h3 className="text-white font-bold">التعاميم</h3>
              {unreadCount > 0 && (
                <span className="text-purple-400 text-sm">{unreadCount} غير مقروء</span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {announcements.length === 0 ? (
                <div className="p-6 text-center text-purple-400">
                  لا توجد تعاميم
                </div>
              ) : (
                announcements.slice(0, 10).map((announcement) => (
                  <div
                    key={announcement.id}
                    onClick={() => !announcement.read_at && markAsRead(announcement.id)}
                    className={`p-4 border-b border-purple-500/10 hover:bg-purple-900/20 cursor-pointer transition-all border-l-4 ${PRIORITY_COLORS[announcement.priority]} ${!announcement.read_at ? 'bg-purple-900/30' : ''}`}
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
              className="block p-3 text-center text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all border-t border-purple-500/20"
              onClick={() => setIsOpen(false)}
            >
              عرض جميع التعاميم
            </Link>
          </div>
        )}
      </div>

      {/* Urgent Announcement Modal */}
      {urgentAnnouncement && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border-2 border-red-500/50 rounded-2xl w-full max-w-lg animate-pulse-slow">
            <div className="p-4 bg-red-500/20 border-b border-red-500/30 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-red-400 font-bold text-lg">تعميم عاجل</h2>
                <p className="text-red-300/70 text-sm">يتطلب الاطلاع الفوري</p>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">{urgentAnnouncement.title}</h3>
              <p className="text-purple-300 whitespace-pre-wrap">{urgentAnnouncement.content}</p>
              
              {urgentAnnouncement.creator && (
                <p className="text-purple-500 text-sm mt-4">
                  من: {urgentAnnouncement.creator.name}
                </p>
              )}
            </div>

            <div className="p-4 border-t border-purple-500/20">
              <button
                onClick={handleUrgentAcknowledge}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl hover:from-red-400 hover:to-orange-400 transition-all"
              >
                تم الاطلاع
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
