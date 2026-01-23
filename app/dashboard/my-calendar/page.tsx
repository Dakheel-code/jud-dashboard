'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';
import AdminSidebar from '@/components/AdminSidebar';
import AdminBottomNav from '@/components/AdminBottomNav';

interface Meeting {
  id: string;
  client_name: string;
  client_email: string;
  subject: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  status: string;
  google_meet_link?: string;
}

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_enabled: boolean;
}

interface TimeOff {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  reason?: string;
}

interface Settings {
  is_accepting_meetings: boolean;
  booking_slug?: string;
  google_calendar_connected: boolean;
  google_email?: string;
  slot_duration: number;
  working_hours: Record<string, { start: string; end: string; enabled: boolean }>;
}

const DAY_NAMES: Record<string, string> = {
  sun: 'الأحد',
  mon: 'الإثنين',
  tue: 'الثلاثاء',
  wed: 'الأربعاء',
  thu: 'الخميس',
  fri: 'الجمعة',
  sat: 'السبت',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'مؤكد', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'ملغي', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  completed: { label: 'مكتمل', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  no_show: { label: 'لم يحضر', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  rescheduled: { label: 'أُعيد جدولته', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

function MyCalendarContent() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'availability' | 'timeoff'>('upcoming');
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Time Off Form
  const [timeOffForm, setTimeOffForm] = useState({
    title: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '17:00',
    reason: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // إعدادات افتراضية
    const defaultSettings: Settings = {
      is_accepting_meetings: true,
      booking_slug: undefined,
      google_calendar_connected: false,
      google_email: undefined,
      slot_duration: 30,
      working_hours: {
        sun: { start: '09:00', end: '17:00', enabled: true },
        mon: { start: '09:00', end: '17:00', enabled: true },
        tue: { start: '09:00', end: '17:00', enabled: true },
        wed: { start: '09:00', end: '17:00', enabled: true },
        thu: { start: '09:00', end: '17:00', enabled: true },
        fri: { start: '09:00', end: '17:00', enabled: false },
        sat: { start: '09:00', end: '17:00', enabled: false },
      },
    };
    
    try {
      const [meetingsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/meetings?status=confirmed&limit=20').catch(() => null),
        fetch('/api/admin/meetings/settings').catch(() => null),
      ]);

      if (meetingsRes?.ok) {
        const data = await meetingsRes.json();
        setMeetings(data.meetings || []);
      }

      if (settingsRes?.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings || defaultSettings);
      } else {
        // استخدام الإعدادات الافتراضية إذا فشل الـ API
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // استخدام الإعدادات الافتراضية في حالة الخطأ
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateAvailability = async (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    const defaultWorkingHours: Record<string, { start: string; end: string; enabled: boolean }> = {
      sun: { start: '09:00', end: '17:00', enabled: true },
      mon: { start: '09:00', end: '17:00', enabled: true },
      tue: { start: '09:00', end: '17:00', enabled: true },
      wed: { start: '09:00', end: '17:00', enabled: true },
      thu: { start: '09:00', end: '17:00', enabled: true },
      fri: { start: '09:00', end: '17:00', enabled: false },
      sat: { start: '09:00', end: '17:00', enabled: false },
    };

    const currentWorkingHours = settings?.working_hours || defaultWorkingHours;
    
    const newSettings: Settings = {
      is_accepting_meetings: settings?.is_accepting_meetings ?? true,
      booking_slug: settings?.booking_slug,
      google_calendar_connected: settings?.google_calendar_connected ?? false,
      google_email: settings?.google_email,
      slot_duration: settings?.slot_duration ?? 30,
      working_hours: {
        ...currentWorkingHours,
        [day]: {
          ...(currentWorkingHours[day] || defaultWorkingHours[day]),
          [field]: value,
        },
      },
    };
    setSettings(newSettings);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/meetings/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_accepting_meetings: settings.is_accepting_meetings,
          slot_duration: settings.slot_duration,
          working_hours: settings.working_hours,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح ✓' });
        // تحديث الإعدادات من الـ API
        if (data.settings) {
          setSettings(prev => prev ? { ...prev, ...data.settings } : data.settings);
        }
        fetchData(); // إعادة جلب البيانات
      } else {
        console.error('Save error:', data);
        setMessage({ type: 'error', text: data.error || 'فشل حفظ الإعدادات' });
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' });
    } finally {
      setSavingSettings(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const addTimeOff = async () => {
    if (!timeOffForm.title || !timeOffForm.start_date || !timeOffForm.end_date) {
      setMessage({ type: 'error', text: 'الرجاء ملء جميع الحقول المطلوبة' });
      return;
    }

    try {
      const response = await fetch('/api/admin/meetings/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: timeOffForm.title,
          start_at: `${timeOffForm.start_date}T${timeOffForm.start_time}:00`,
          end_at: `${timeOffForm.end_date}T${timeOffForm.end_time}:00`,
          reason: timeOffForm.reason,
        }),
      });

      if (response.ok) {
        setShowTimeOffModal(false);
        setTimeOffForm({ title: '', start_date: '', start_time: '09:00', end_date: '', end_time: '17:00', reason: '' });
        setMessage({ type: 'success', text: 'تمت إضافة الإجازة' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'فشل إضافة الإجازة' });
      }
    } catch {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 border-l-fuchsia-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-4 flex items-center justify-center">
              <img src="/logo.png" alt="Loading" className="w-full h-full object-contain animate-pulse" />
            </div>
          </div>
          <div className="text-xl text-white font-semibold">جاري التحميل...</div>
        </div>
      </div>
    );
  }

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
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="text-white font-bold">جود</span>
            </div>
            <div className="w-10"></div>
          </div>
        </div>
        
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain hidden lg:block" />
              <div className="hidden lg:block h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
              <div>
                <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>تقويمي</h1>
                <p className="text-purple-300/80 text-xs sm:text-sm">إدارة اجتماعاتك وأوقات عملك</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Google Calendar Status */}
              {settings?.google_calendar_connected ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm">Google متصل</span>
                </div>
              ) : (
                <a
                  href="/api/google/connect"
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all text-sm flex-1 sm:flex-none"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                  </svg>
                  ربط Google
                </a>
              )}
              <Link href="/admin" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all text-sm flex-1 sm:flex-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                <span>لوحة التحكم</span>
              </Link>
            </div>
          </div>

      {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-xl ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* Booking Link Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold mb-1">رابط الحجز الخاص بك</h3>
                <p className="text-purple-300/60 text-sm">شارك هذا الرابط مع العملاء لحجز اجتماع معك</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {settings?.booking_slug ? (
                  <>
                    <code className="px-3 py-2 bg-purple-900/50 rounded-xl text-purple-300 text-sm break-all" dir="ltr">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/meet/{settings.booking_slug}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/meet/${settings.booking_slug}`);
                        setMessage({ type: 'success', text: 'تم نسخ الرابط!' });
                      }}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all text-sm whitespace-nowrap"
                    >
                      📋 نسخ
                    </button>
                    <a
                      href={`/meet/${settings.booking_slug}`}
                      target="_blank"
                      className="px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-xl transition-all text-sm whitespace-nowrap"
                    >
                      معاينة ↗
                    </a>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400/80 text-sm">سيتم إنشاء رابط الحجز تلقائياً عند حفظ الإعدادات</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
        {[
            { id: 'upcoming', label: 'الاجتماعات القادمة', icon: '📅' },
            { id: 'availability', label: 'أوقات العمل', icon: '⏰' },
            { id: 'timeoff', label: 'الإجازات', icon: '🏖️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
          </div>

      {/* Tab Content */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📅</span>
                  </div>
                  <p className="text-purple-300/60">لا توجد اجتماعات قادمة</p>
                </div>
              ) : (
                meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className={`bg-white/5 backdrop-blur-xl border rounded-2xl p-4 ${
                      isToday(meeting.start_at) ? 'border-purple-500/50' : 'border-purple-500/20'
                    }`}
                  >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-medium">{meeting.subject}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_LABELS[meeting.status]?.color}`}>
                        {STATUS_LABELS[meeting.status]?.label}
                      </span>
                      {isToday(meeting.start_at) && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-xs">اليوم</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-purple-300">
                      <span className="flex items-center gap-1">
                        <span>👤</span> {meeting.client_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📧</span> {meeting.client_email}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-purple-400">
                      <span>📅 {formatDate(meeting.start_at)}</span>
                      <span>🕐 {formatTime(meeting.start_at)} - {formatTime(meeting.end_at)}</span>
                      <span>⏱️ {meeting.duration_minutes} دقيقة</span>
                    </div>
                  </div>
                  
                  {meeting.google_meet_link && (
                    <a
                      href={meeting.google_meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all flex items-center gap-2"
                    >
                      <span>📹</span> انضم
                    </a>
                  )}
                </div>
              </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">أوقات العمل</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.is_accepting_meetings ?? true}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, is_accepting_meetings: e.target.checked } : null)}
                    className="w-5 h-5 rounded bg-purple-900/30 border-purple-500/30 text-purple-600"
                  />
                  <span className="text-purple-300">قبول الحجوزات</span>
                </label>
              </div>
              
              <div className="space-y-3 mb-6">
                {Object.entries(DAY_NAMES).map(([day, name]) => {
                  const dayEnabled = settings?.working_hours?.[day]?.enabled ?? (day !== 'fri' && day !== 'sat');
                  return (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 bg-purple-900/20 rounded-xl">
                      <label className="flex items-center gap-2 w-28 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dayEnabled}
                          onChange={(e) => updateAvailability(day, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded bg-purple-900/30 border-purple-500/30 text-purple-600"
                        />
                        <span className={`text-sm ${dayEnabled ? 'text-white font-medium' : 'text-purple-400/50'}`}>
                          {name}
                        </span>
                      </label>
                      
                      {dayEnabled && (
                        <div className="flex items-center gap-2 flex-1 mr-6 sm:mr-0">
                          <input
                            type="time"
                            value={settings?.working_hours?.[day]?.start || '09:00'}
                            onChange={(e) => updateAvailability(day, 'start', e.target.value)}
                            className="px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm flex-1"
                          />
                          <span className="text-purple-400">إلى</span>
                          <input
                            type="time"
                            value={settings?.working_hours?.[day]?.end || '17:00'}
                            onChange={(e) => updateAvailability(day, 'end', e.target.value)}
                            className="px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm flex-1"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-xl transition-all"
                >
                  {savingSettings ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'timeoff' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">الإجازات والأوقات المحجوبة</h2>
                <button
                  onClick={() => setShowTimeOffModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all flex items-center gap-2"
                >
                  <span>+</span> إضافة إجازة
                </button>
              </div>
              
              {timeOffs.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🏖️</span>
                  </div>
                  <p className="text-purple-300/60">لا توجد إجازات مسجلة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeOffs.map((timeOff) => (
                    <div key={timeOff.id} className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4">
                  <h3 className="text-white font-medium">{timeOff.title}</h3>
                  <p className="text-purple-400 text-sm mt-1">
                    {formatDate(timeOff.start_at)} - {formatDate(timeOff.end_at)}
                  </p>
                  {timeOff.reason && (
                    <p className="text-purple-400/60 text-sm mt-1">{timeOff.reason}</p>
                  )}
                </div>
                  ))}
                </div>
              )}
            </div>
          )}

      {/* Time Off Modal */}
          {showTimeOffModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-white mb-4">إضافة إجازة</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">العنوان *</label>
                    <input
                      type="text"
                      value={timeOffForm.title}
                      onChange={(e) => setTimeOffForm({ ...timeOffForm, title: e.target.value })}
                      className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white"
                      placeholder="مثال: إجازة سنوية"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-purple-300 text-sm mb-1">تاريخ البداية *</label>
                      <input
                        type="date"
                        value={timeOffForm.start_date}
                        onChange={(e) => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })}
                        className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-300 text-sm mb-1">وقت البداية</label>
                      <input
                        type="time"
                        value={timeOffForm.start_time}
                        onChange={(e) => setTimeOffForm({ ...timeOffForm, start_time: e.target.value })}
                        className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-purple-300 text-sm mb-1">تاريخ النهاية *</label>
                      <input
                        type="date"
                        value={timeOffForm.end_date}
                        onChange={(e) => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })}
                        className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-300 text-sm mb-1">وقت النهاية</label>
                      <input
                        type="time"
                        value={timeOffForm.end_time}
                        onChange={(e) => setTimeOffForm({ ...timeOffForm, end_time: e.target.value })}
                        className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">السبب (اختياري)</label>
                    <textarea
                      value={timeOffForm.reason}
                      onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
                      className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white resize-none"
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowTimeOffModal(false)}
                    className="flex-1 px-4 py-3 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-xl transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={addTimeOff}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all"
                  >
                    إضافة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Navigation for Mobile */}
        <AdminBottomNav />
        
        {/* Spacer for bottom nav */}
        <div className="h-20 lg:hidden"></div>
      </div>
    </div>
  );
}

export default function MyCalendarPage() {
  return (
    <AdminAuth>
      <MyCalendarContent />
    </AdminAuth>
  );
}
