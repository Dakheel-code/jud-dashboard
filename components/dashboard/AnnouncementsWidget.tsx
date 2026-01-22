'use client';

import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  type: string;
  created_at: string;
  is_read: boolean;
}

interface AnnouncementsWidgetProps {
  announcements: Announcement[];
  canSendAnnouncement?: boolean;
}

export default function AnnouncementsWidget({ announcements, canSendAnnouncement = true }: AnnouncementsWidgetProps) {
  // عرض أول 5 تعاميم فقط
  const displayAnnouncements = announcements.slice(0, 5);
  
  // حساب عدد التعاميم غير المقروءة
  const unreadCount = announcements.filter(a => !a.is_read).length;

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'منذ قليل';
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    if (diffInHours < 48) return 'أمس';
    if (diffInHours < 168) return `منذ ${Math.floor(diffInHours / 24)} أيام`;
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  };

  // الحصول على نمط النوع
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'urgent':
        return {
          badge: 'bg-red-500/20 text-red-400 border-red-500/30',
          text: 'عاجل'
        };
      case 'scheduled':
        return {
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          text: 'مجدول'
        };
      case 'normal':
      default:
        return {
          badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          text: 'عام'
        };
    }
  };

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center relative">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            {/* Unread Badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">التعاميم</h3>
            <p className="text-xs text-purple-300/60">
              {unreadCount > 0 ? `${unreadCount} غير مقروء` : 'لا توجد تعاميم جديدة'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canSendAnnouncement && (
            <Link
              href="/admin/announcements?action=new"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>إرسال تعميم</span>
            </Link>
          )}
          <Link
            href="/admin/announcements"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors"
          >
            <span>عرض الكل</span>
            <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Content */}
      {displayAnnouncements.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <h4 className="text-white font-medium mb-1">لا توجد تعاميم</h4>
          <p className="text-purple-300/60 text-sm mb-4">لم يتم إرسال أي تعاميم بعد</p>
          {canSendAnnouncement && (
            <Link
              href="/admin/announcements?action=new"
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>إرسال أول تعميم</span>
            </Link>
          )}
        </div>
      ) : (
        // Announcements List
        <div className="space-y-2">
          {displayAnnouncements.map((announcement) => {
            const typeStyle = getTypeStyle(announcement.type);
            
            return (
              <Link
                key={announcement.id}
                href={`/admin/announcements/${announcement.id}`}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                  !announcement.is_read 
                    ? 'bg-purple-900/30 hover:bg-purple-900/40' 
                    : 'bg-purple-900/10 hover:bg-purple-900/20'
                }`}
              >
                {/* Unread Indicator */}
                <div className="flex-shrink-0">
                  {!announcement.is_read ? (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full block"></span>
                  ) : (
                    <span className="w-2.5 h-2.5 bg-purple-700/50 rounded-full block"></span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {announcement.type === 'urgent' && (
                      <span className={`px-1.5 py-0.5 rounded text-xs border ${typeStyle.badge}`}>
                        {typeStyle.text}
                      </span>
                    )}
                    <span className={`text-sm truncate group-hover:text-orange-400 transition-colors ${
                      !announcement.is_read ? 'text-white font-medium' : 'text-purple-300'
                    }`}>
                      {announcement.title}
                    </span>
                  </div>
                  <div className="text-xs text-purple-300/50">
                    {formatDate(announcement.created_at)}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}

      {/* View All Link */}
      {announcements.length > 5 && (
        <div className="mt-4 text-center">
          <Link
            href="/admin/announcements"
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <span>عرض كل التعاميم ({announcements.length})</span>
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
