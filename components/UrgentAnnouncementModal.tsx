'use client';

import { useEffect, useState, useRef } from 'react';

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

export default function UrgentAnnouncementModal() {
  const [urgentAnnouncement, setUrgentAnnouncement] = useState<Announcement | null>(null);
  const acknowledgedIdsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const currentAnnouncementRef = useRef<Announcement | null>(null);

  const getUserId = (): string | null => {
    try {
      const userStr = localStorage.getItem('admin_user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user?.id || null;
    } catch {
      return null;
    }
  };

  const fetchUrgentAnnouncement = async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/api/announcements/my?user_id=${userId}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      if (!response.ok || !isMountedRef.current) return;
      
      const data = await response.json();
      const announcements: Announcement[] = data.announcements || [];

      const unreadUrgent = announcements.find(
        (a) => a.type === 'urgent' && !a.read_at && !acknowledgedIdsRef.current.has(a.id)
      );

      if (unreadUrgent && !currentAnnouncementRef.current) {
        currentAnnouncementRef.current = unreadUrgent;
        setUrgentAnnouncement(unreadUrgent);
      }
    } catch {}
  };

  const markAsRead = async (announcementId: string) => {
    const userId = getUserId();
    if (!userId) return;
    try {
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
    } catch {}
  };

  const handleAcknowledge = async () => {
    if (!urgentAnnouncement) return;
    const id = urgentAnnouncement.id;
    acknowledgedIdsRef.current.add(id);
    currentAnnouncementRef.current = null;
    setUrgentAnnouncement(null);
    await markAsRead(id);
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchUrgentAnnouncement();
    const interval = setInterval(fetchUrgentAnnouncement, 15000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!urgentAnnouncement) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-[#0a0118] border-2 border-purple-500/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-500/20">
        <div className="p-4 bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 border-b border-purple-500/30 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">تعميم عاجل</h2>
            <p className="text-purple-300/70 text-sm">يتطلب الاطلاع الفوري</p>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">{urgentAnnouncement.title}</h3>
          <p className="text-purple-200 whitespace-pre-wrap leading-relaxed">{urgentAnnouncement.content}</p>
          
          {urgentAnnouncement.creator && (
            <p className="text-purple-400 text-sm mt-4">
              من: {urgentAnnouncement.creator.name}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-purple-500/20">
          <button
            onClick={handleAcknowledge}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-purple-500/30"
          >
            تم الاطلاع
          </button>
        </div>
      </div>
    </div>
  );
}
