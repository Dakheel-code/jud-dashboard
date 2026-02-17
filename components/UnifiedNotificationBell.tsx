'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface TaskNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
  source: 'task';
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'urgent' | 'scheduled' | 'conditional';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
  source: 'announcement';
}

type UnifiedNotification = TaskNotification | Announcement;

type TabType = 'all' | 'tasks' | 'announcements';

export default function UnifiedNotificationBell() {
  const [taskNotifications, setTaskNotifications] = useState<TaskNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
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

  const fetchTaskNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=10');
      const data = await response.json();
      if (response.ok && isMountedRef.current) {
        const notifications = (data.notifications || []).map((n: any) => ({
          ...n,
          source: 'task' as const
        }));
        setTaskNotifications(notifications);
      }
    } catch (error) {
      console.error('Error fetching task notifications:', error);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/announcements/my?user_id=${userId}&t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) return;
      
      const data = await response.json();
      if (!isMountedRef.current) return;

      const announcementsList = (data.announcements || data.data?.announcements || []).map((a: any) => ({
        ...a,
        source: 'announcement' as const
      }));
      setAnnouncements(announcementsList);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }, [getUserId]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchTaskNotifications(), fetchAnnouncements()]);
  }, [fetchTaskNotifications, fetchAnnouncements]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAll]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markTaskAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId })
      });
      setTaskNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAnnouncementAsRead = async (announcementId: string) => {
    const userId = getUserId();
    if (!userId) return;

    try {
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      setAnnouncements(prev =>
        prev.map(a => a.id === announcementId ? { ...a, read_at: new Date().toISOString() } : a)
      );
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const handleNotificationClick = async (notification: UnifiedNotification) => {
    if (!notification.read_at) {
      if (notification.source === 'task') {
        await markTaskAsRead(notification.id);
      } else {
        await markAnnouncementAsRead(notification.id);
      }
    }
    
    if (notification.source === 'task' && (notification as TaskNotification).link) {
      window.location.href = (notification as TaskNotification).link!;
    } else if (notification.source === 'announcement') {
      window.location.href = '/announcements';
    }
    setIsOpen(false);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} د`;
    if (hours < 24) return `منذ ${hours} س`;
    if (days < 7) return `منذ ${days} ي`;
    return date.toLocaleDateString('ar-SA');
  };

  const getIcon = (notification: UnifiedNotification) => {
    if (notification.source === 'announcement') {
      const ann = notification as Announcement;
      return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          ann.type === 'urgent' ? 'bg-red-500/20' : 'bg-blue-500/20'
        }`}>
          <svg className={`w-4 h-4 ${ann.type === 'urgent' ? 'text-red-400' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
      );
    }
    
    const taskN = notification as TaskNotification;
    const colors: Record<string, string> = {
      reassign: 'bg-blue-500/20 text-blue-400',
      help_request: 'bg-orange-500/20 text-orange-400',
      help_response: 'bg-green-500/20 text-green-400',
      mention: 'bg-purple-500/20 text-purple-400',
    };
    const colorClass = colors[taskN.type] || 'bg-gray-500/20 text-gray-400';
    
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass.split(' ')[0]}`}>
        <svg className={`w-4 h-4 ${colorClass.split(' ')[1]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
    );
  };

  // حساب الأعداد
  const taskUnread = taskNotifications.filter(n => !n.read_at).length;
  const announcementUnread = announcements.filter(a => !a.read_at).length;
  const totalUnread = taskUnread + announcementUnread;

  // دمج وترتيب التنبيهات
  const allNotifications: UnifiedNotification[] = [...taskNotifications, ...announcements]
    .sort((a, b) => {
      const dateA = new Date(a.source === 'announcement' ? ((a as Announcement).sent_at || a.created_at) : a.created_at);
      const dateB = new Date(b.source === 'announcement' ? ((b as Announcement).sent_at || b.created_at) : b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

  const filteredNotifications = activeTab === 'all' 
    ? allNotifications 
    : activeTab === 'tasks' 
      ? taskNotifications 
      : announcements;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-xl transition-all"
        title="التنبيهات"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setIsOpen(false)} />
          <div className="fixed top-16 left-4 sm:left-auto sm:right-4 w-[calc(100%-2rem)] sm:w-80 bg-gradient-to-br from-purple-950 to-slate-900 border border-purple-500/30 rounded-xl shadow-2xl z-[99999] overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-purple-500/20">
              <h3 className="text-white font-semibold text-sm mb-2">التنبيهات</h3>
              
              {/* Tabs */}
              <div className="flex gap-1 bg-purple-900/30 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    activeTab === 'all' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  الكل {totalUnread > 0 && `(${totalUnread})`}
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    activeTab === 'tasks' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  المهام {taskUnread > 0 && `(${taskUnread})`}
                </button>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    activeTab === 'announcements' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  التعاميم {announcementUnread > 0 && `(${announcementUnread})`}
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-purple-400/60">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-sm">لا توجد تنبيهات</p>
                </div>
              ) : (
                filteredNotifications.slice(0, 15).map(notification => (
                  <button
                    key={`${notification.source}-${notification.id}`}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-3 flex items-start gap-3 hover:bg-purple-800/30 transition-colors text-right border-b border-purple-500/10 ${
                      !notification.read_at ? 'bg-purple-800/20' : ''
                    }`}
                  >
                    {getIcon(notification)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${!notification.read_at ? 'text-white' : 'text-purple-300'}`}>
                          {notification.title}
                        </p>
                        <span className={`px-1.5 py-0.5 text-[9px] rounded ${
                          notification.source === 'task' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {notification.source === 'task' ? 'مهمة' : 'تعميم'}
                        </span>
                      </div>
                      <p className="text-purple-400/70 text-xs mt-0.5 line-clamp-1">
                        {notification.source === 'task' 
                          ? (notification as TaskNotification).body 
                          : (notification as Announcement).content}
                      </p>
                      <p className="text-purple-400/50 text-[10px] mt-1">
                        {formatTime(notification.source === 'announcement' 
                          ? ((notification as Announcement).sent_at || notification.created_at)
                          : notification.created_at)}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer Links */}
            <div className="flex border-t border-purple-500/20">
              <Link
                href="/tasks/my"
                className="flex-1 p-2 text-center text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all text-xs border-l border-purple-500/20"
                onClick={() => setIsOpen(false)}
              >
                مهامي
              </Link>
              <Link
                href="/announcements"
                className="flex-1 p-2 text-center text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all text-xs"
                onClick={() => setIsOpen(false)}
              >
                التعاميم
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
