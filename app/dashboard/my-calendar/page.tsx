'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';
import AdminSidebar from '@/components/AdminSidebar';
import AdminBottomNav from '@/components/AdminBottomNav';
import { useBranding } from '@/contexts/BrandingContext';

interface Meeting {
  id: string;
  employee_id?: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  subject: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  status: string;
  google_meet_link?: string;
  created_at?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
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

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface Settings {
  is_accepting_meetings: boolean;
  booking_slug?: string;
  google_calendar_connected: boolean;
  google_email?: string;
  slot_duration: number;
  working_hours: Record<string, DaySchedule>;
  max_days_ahead?: number;
  min_notice_hours?: number;
  min_notice_unit?: 'minutes' | 'hours' | 'days';
  buffer_minutes?: number;
  meeting_title?: string;
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

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
  { value: 'no_show', label: 'لم يحضر' },
  { value: 'rescheduled', label: 'أُعيد جدولته' },
];

function MyCalendarContent() {
  const { branding } = useBranding();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'timeoff' | 'admin'>('upcoming');
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  const [copyTimesDay, setCopyTimesDay] = useState<string | null>(null);
  const [copyTimesTarget, setCopyTimesTarget] = useState<string[]>([]);
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

  // Admin Meetings Management State
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminPage, setAdminPage] = useState(1);
  const [adminTotalPages, setAdminTotalPages] = useState(1);
  const [adminFilters, setAdminFilters] = useState({
    employee_id: '',
    status: '',
    start_date: '',
    end_date: '',
  });

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  const fetchAllMeetings = useCallback(async () => {
    setAdminLoading(true);
    try {
      const params = new URLSearchParams({
        page: adminPage.toString(),
        limit: '15',
      });
      
      if (adminFilters.status) params.set('status', adminFilters.status);
      if (adminFilters.start_date) params.set('start_date', adminFilters.start_date);
      if (adminFilters.end_date) params.set('end_date', adminFilters.end_date);
      if (adminFilters.employee_id) params.set('employee_id', adminFilters.employee_id);

      const response = await fetch(`/api/admin/meetings/all?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAllMeetings(data.meetings || []);
        setAdminTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setAdminLoading(false);
    }
  }, [adminPage, adminFilters]);

  const getDefaultWorkingHours = (): Record<string, DaySchedule> => ({
    sun: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    mon: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    tue: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    wed: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    thu: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    fri: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
    sat: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
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
      working_hours: getDefaultWorkingHours(),
      max_days_ahead: 30,
      min_notice_hours: 4,
      min_notice_unit: 'hours',
      buffer_minutes: 15,
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
    fetchEmployees();
  }, [fetchData, fetchEmployees]);

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAllMeetings();
    }
  }, [activeTab, fetchAllMeetings]);

  const getLastEnabledDaySlots = (): TimeSlot[] => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    for (let i = days.length - 1; i >= 0; i--) {
      const day = days[i];
      if (settings?.working_hours?.[day]?.enabled && settings.working_hours[day].slots?.length > 0) {
        return [...settings.working_hours[day].slots];
      }
    }
    return [{ start: '09:00', end: '17:00' }];
  };

  const toggleDayEnabled = (day: string, enabled: boolean) => {
    const currentWorkingHours = settings?.working_hours || getDefaultWorkingHours();
    const slots = enabled ? getLastEnabledDaySlots() : (currentWorkingHours[day]?.slots || [{ start: '09:00', end: '17:00' }]);
    
    const newSettings: Settings = {
      is_accepting_meetings: settings?.is_accepting_meetings ?? true,
      booking_slug: settings?.booking_slug,
      google_calendar_connected: settings?.google_calendar_connected ?? false,
      google_email: settings?.google_email,
      slot_duration: settings?.slot_duration ?? 30,
      working_hours: {
        ...currentWorkingHours,
        [day]: { enabled, slots },
      },
    };
    setSettings(newSettings);
  };

  const updateSlotTime = (day: string, slotIndex: number, field: 'start' | 'end', value: string) => {
    const currentWorkingHours = settings?.working_hours || getDefaultWorkingHours();
    const daySchedule = currentWorkingHours[day] || { enabled: true, slots: [{ start: '09:00', end: '17:00' }] };
    const newSlots = [...daySchedule.slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
    
    const newSettings: Settings = {
      is_accepting_meetings: settings?.is_accepting_meetings ?? true,
      booking_slug: settings?.booking_slug,
      google_calendar_connected: settings?.google_calendar_connected ?? false,
      google_email: settings?.google_email,
      slot_duration: settings?.slot_duration ?? 30,
      working_hours: {
        ...currentWorkingHours,
        [day]: { ...daySchedule, slots: newSlots },
      },
    };
    setSettings(newSettings);
  };

  const addSlot = (day: string) => {
    const currentWorkingHours = settings?.working_hours || getDefaultWorkingHours();
    const daySchedule = currentWorkingHours[day] || { enabled: true, slots: [{ start: '09:00', end: '17:00' }] };
    const existingSlots = daySchedule.slots || [{ start: '09:00', end: '17:00' }];
    const lastSlot = existingSlots[existingSlots.length - 1] || { start: '09:00', end: '17:00' };
    const newSlots = [...existingSlots, { start: lastSlot.start, end: lastSlot.end }];
    
    const newSettings: Settings = {
      is_accepting_meetings: settings?.is_accepting_meetings ?? true,
      booking_slug: settings?.booking_slug,
      google_calendar_connected: settings?.google_calendar_connected ?? false,
      google_email: settings?.google_email,
      slot_duration: settings?.slot_duration ?? 30,
      working_hours: {
        ...currentWorkingHours,
        [day]: { ...daySchedule, slots: newSlots },
      },
    };
    setSettings(newSettings);
  };

  const removeSlot = (day: string, slotIndex: number) => {
    const currentWorkingHours = settings?.working_hours || getDefaultWorkingHours();
    const daySchedule = currentWorkingHours[day];
    if (!daySchedule || !daySchedule.slots || daySchedule.slots.length <= 1) return;
    
    const newSlots = daySchedule.slots.filter((_, i) => i !== slotIndex);
    
    const newSettings: Settings = {
      is_accepting_meetings: settings?.is_accepting_meetings ?? true,
      booking_slug: settings?.booking_slug,
      google_calendar_connected: settings?.google_calendar_connected ?? false,
      google_email: settings?.google_email,
      slot_duration: settings?.slot_duration ?? 30,
      working_hours: {
        ...currentWorkingHours,
        [day]: { ...daySchedule, slots: newSlots },
      },
    };
    setSettings(newSettings);
  };

  const copyTimesToDays = () => {
    if (!copyTimesDay || copyTimesTarget.length === 0) return;
    
    const currentWorkingHours = settings?.working_hours || getDefaultWorkingHours();
    const sourceSchedule = currentWorkingHours[copyTimesDay];
    if (!sourceSchedule) return;
    
    const newWorkingHours = { ...currentWorkingHours };
    copyTimesTarget.forEach(targetDay => {
      newWorkingHours[targetDay] = {
        enabled: true,
        slots: [...sourceSchedule.slots],
      };
    });
    
    const newSettings: Settings = {
      is_accepting_meetings: settings?.is_accepting_meetings ?? true,
      booking_slug: settings?.booking_slug,
      google_calendar_connected: settings?.google_calendar_connected ?? false,
      google_email: settings?.google_email,
      slot_duration: settings?.slot_duration ?? 30,
      working_hours: newWorkingHours,
    };
    setSettings(newSettings);
    setCopyTimesDay(null);
    setCopyTimesTarget([]);
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
          max_days_ahead: settings.max_days_ahead,
          min_notice_hours: settings.min_notice_hours,
          min_notice_unit: settings.min_notice_unit,
          buffer_minutes: settings.buffer_minutes,
          meeting_title: settings.meeting_title,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح ✓' });
        if (data.settings) {
          setSettings(prev => prev ? { ...prev, ...data.settings } : data.settings);
        }
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
              <img src={branding.logo || '/logo.png'} alt="Loading" className="w-full h-full object-contain animate-pulse" />
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
              <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-8 h-8 object-contain" />
              <span className="text-white font-bold">{branding.companyName || 'جود'}</span>
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
              <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-14 h-14 sm:w-20 sm:h-20 object-contain hidden lg:block" />
              <div className="hidden lg:block h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
              <div>
                <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>الاجتماعات</h1>
                <p className="text-purple-300/80 text-xs sm:text-sm">إدارة اجتماعاتك وأوقات عملك</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Google Calendar Status */}
              {settings?.google_calendar_connected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 text-sm">Google متصل</span>
                    {settings?.google_email && (
                      <span className="text-green-400/60 text-xs hidden sm:inline">({settings.google_email})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href="/api/google/connect"
                      className="p-2 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-all"
                      title="إعادة الربط"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </a>
                    <a
                      href="/api/google/disconnect"
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all"
                      title="إلغاء الربط"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </a>
                  </div>
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
                      {typeof window !== 'undefined' ? window.location.origin : ''}/book/{settings.booking_slug}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/book/${settings.booking_slug}`);
                        setMessage({ type: 'success', text: 'تم نسخ الرابط!' });
                      }}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all text-sm whitespace-nowrap"
                    >
                      📋 نسخ
                    </button>
                    <a
                      href={`/book/${settings.booking_slug}`}
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
              { id: 'timeoff', label: 'الإجازات', icon: '🏖️' },
              { id: 'admin', label: 'إدارة الاجتماعات', icon: '👥' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'upcoming' | 'timeoff' | 'admin')}
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
            {/* زر أوقات العمل - يفتح نافذة منبثقة */}
            <button
              onClick={() => setShowWorkingHoursModal(true)}
              className="px-4 py-2 rounded-xl transition-all flex items-center gap-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
            >
              <span>⏰</span>
              <span>أوقات العمل</span>
            </button>
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

          {/* Admin Meetings Tab */}
          {activeTab === 'admin' && (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">إدارة الاجتماعات</h2>
                  <p className="text-purple-400/60 text-sm">عرض وإدارة جميع اجتماعات الموظفين</p>
                </div>
                <Link
                  href="/dashboard/admin/meetings/stats"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all flex items-center gap-2 w-fit"
                >
                  <span>📊</span> الإحصائيات
                </Link>
              </div>

              {/* Filters */}
              <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">الموظف</label>
                    <select
                      value={adminFilters.employee_id}
                      onChange={(e) => {
                        setAdminFilters({ ...adminFilters, employee_id: e.target.value });
                        setAdminPage(1);
                      }}
                      className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm"
                    >
                      <option value="">كل الموظفين</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">الحالة</label>
                    <select
                      value={adminFilters.status}
                      onChange={(e) => {
                        setAdminFilters({ ...adminFilters, status: e.target.value });
                        setAdminPage(1);
                      }}
                      className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">من تاريخ</label>
                    <input
                      type="date"
                      value={adminFilters.start_date}
                      onChange={(e) => {
                        setAdminFilters({ ...adminFilters, start_date: e.target.value });
                        setAdminPage(1);
                      }}
                      className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">إلى تاريخ</label>
                    <input
                      type="date"
                      value={adminFilters.end_date}
                      onChange={(e) => {
                        setAdminFilters({ ...adminFilters, end_date: e.target.value });
                        setAdminPage(1);
                      }}
                      className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setAdminFilters({ employee_id: '', status: '', start_date: '', end_date: '' });
                        setAdminPage(1);
                      }}
                      className="w-full px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-lg text-sm transition-all"
                    >
                      مسح الفلاتر
                    </button>
                  </div>
                </div>
              </div>

              {/* Meetings Table */}
              {adminLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : allMeetings.length === 0 ? (
                <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-12 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-purple-400/60">لا توجد اجتماعات</p>
                </div>
              ) : (
                <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-purple-500/20">
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الموظف</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">العميل</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الموضوع</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">التاريخ</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الوقت</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الحالة</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMeetings.map((meeting) => {
                          const employee = employees.find(e => e.id === meeting.employee_id);
                          return (
                            <tr key={meeting.id} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                              <td className="px-4 py-3 text-white text-sm">{employee?.name || 'غير معروف'}</td>
                              <td className="px-4 py-3">
                                <div className="text-white text-sm">{meeting.client_name}</div>
                                <div className="text-purple-400/60 text-xs">{meeting.client_email}</div>
                              </td>
                              <td className="px-4 py-3 text-white text-sm max-w-[200px] truncate">{meeting.subject}</td>
                              <td className="px-4 py-3 text-purple-300 text-sm">
                                {new Date(meeting.start_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-purple-300 text-sm">
                                {formatTime(meeting.start_at)} - {formatTime(meeting.end_at)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs border ${STATUS_LABELS[meeting.status]?.color || ''}`}>
                                  {STATUS_LABELS[meeting.status]?.label || meeting.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {meeting.google_meet_link && (
                                    <a
                                      href={meeting.google_meet_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-all"
                                      title="انضم للاجتماع"
                                    >
                                      📹
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {adminTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setAdminPage(Math.max(1, adminPage - 1))}
                    disabled={adminPage === 1}
                    className="px-4 py-2 bg-purple-900/30 hover:bg-purple-800/30 disabled:opacity-50 text-purple-300 rounded-lg transition-all"
                  >
                    السابق
                  </button>
                  <span className="text-purple-400 px-4">
                    {adminPage} من {adminTotalPages}
                  </span>
                  <button
                    onClick={() => setAdminPage(Math.min(adminTotalPages, adminPage + 1))}
                    disabled={adminPage === adminTotalPages}
                    className="px-4 py-2 bg-purple-900/30 hover:bg-purple-800/30 disabled:opacity-50 text-purple-300 rounded-lg transition-all"
                  >
                    التالي
                  </button>
                </div>
              )}
            </div>
          )}

      {/* Working Hours Modal */}
          {showWorkingHoursModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">🔄 ساعات العمل</h2>
                    <p className="text-purple-400/60 text-xs">حدد أوقات توفرك للاجتماعات</p>
                  </div>
                  <button
                    onClick={() => setShowWorkingHoursModal(false)}
                    className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* عنوان الاجتماع */}
                <div className="mb-4">
                  <label className="block text-purple-300 text-sm mb-2">عنوان الاجتماع</label>
                  <input
                    type="text"
                    value={settings?.meeting_title || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, meeting_title: e.target.value } : null)}
                    placeholder={`اجتماع ${settings?.slot_duration || 30} دقيقة`}
                    className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm placeholder-purple-400/50"
                  />
                </div>

                {/* إعدادات الحجز */}
                <div className="mb-4 p-3 bg-purple-900/20 rounded-xl space-y-3">
                  {/* نطاق الحجز */}
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 text-sm">نطاق الحجز</span>
                    <div className="flex items-center gap-1" dir="ltr">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings?.max_days_ahead ?? 30}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, max_days_ahead: Number(e.target.value) } : null)}
                        className="w-14 px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-purple-400 text-sm">يوم</span>
                    </div>
                  </div>
                  
                  {/* الإشعار المسبق */}
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 text-sm">لا يمكن الحجز قبل</span>
                    <div className="flex items-center bg-purple-900/50 border border-purple-500/30 rounded overflow-hidden" dir="ltr">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={settings?.min_notice_hours ?? 4}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, min_notice_hours: Number(e.target.value) } : null)}
                        className="w-12 px-2 py-1 bg-transparent text-white text-sm text-center border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="w-px h-5 bg-purple-500/30"></div>
                      <select
                        value={settings?.min_notice_unit ?? 'hours'}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, min_notice_unit: e.target.value as 'minutes' | 'hours' | 'days' } : null)}
                        className="px-2 py-1 bg-transparent text-white text-sm border-none outline-none cursor-pointer"
                        dir="rtl"
                      >
                        <option value="minutes" className="bg-[#1a0a2e]">دقائق</option>
                        <option value="hours" className="bg-[#1a0a2e]">ساعات</option>
                        <option value="days" className="bg-[#1a0a2e]">أيام</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* وقت الراحة */}
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 text-sm">راحة بين الاجتماعات</span>
                    <div className="flex items-center gap-1" dir="ltr">
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={settings?.buffer_minutes ?? 15}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, buffer_minutes: Number(e.target.value) } : null)}
                        className="w-14 px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-purple-400 text-sm">دقيقة</span>
                    </div>
                  </div>
                </div>

                {/* أيام العمل */}
                <div className="space-y-2">
                  {Object.entries(DAY_NAMES).map(([day, name]) => {
                    const daySchedule = settings?.working_hours?.[day];
                    const dayEnabled = daySchedule?.enabled ?? (day !== 'fri' && day !== 'sat');
                    const slots = daySchedule?.slots || [{ start: '09:00', end: '17:00' }];
                    
                    return (
                      <div key={day} className="flex items-center gap-3 py-2 border-b border-purple-500/10 last:border-0">
                        {/* اسم اليوم */}
                        <div 
                          onClick={() => toggleDayEnabled(day, !dayEnabled)}
                          className={`w-16 py-1.5 rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer flex-shrink-0 ${
                            dayEnabled ? 'bg-purple-600 text-white' : 'bg-purple-900/30 text-purple-400/50'
                          }`}
                        >
                          {name}
                        </div>
                        
                        {/* المحتوى */}
                        <div className="flex-1">
                          {!dayEnabled ? (
                            <div className="flex items-center gap-1">
                              <span className="text-purple-400/50 text-sm">غير متاح</span>
                              <button onClick={() => toggleDayEnabled(day, true)} className="p-1 text-purple-400 hover:text-purple-300 rounded">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {slots.map((slot, slotIndex) => (
                                <div key={slotIndex} className="flex items-center gap-1">
                                  <input
                                    type="time"
                                    value={slot.start}
                                    onChange={(e) => updateSlotTime(day, slotIndex, 'start', e.target.value)}
                                    className="px-2 py-1 bg-purple-900/30 border border-purple-500/20 rounded text-white text-sm w-[90px]"
                                  />
                                  <span className="text-purple-400/60">-</span>
                                  <input
                                    type="time"
                                    value={slot.end}
                                    onChange={(e) => updateSlotTime(day, slotIndex, 'end', e.target.value)}
                                    className="px-2 py-1 bg-purple-900/30 border border-purple-500/20 rounded text-white text-sm w-[90px]"
                                  />
                                  <button onClick={() => slots.length > 1 ? removeSlot(day, slotIndex) : toggleDayEnabled(day, false)} className="p-1 text-purple-400/60 hover:text-red-400" title="حذف">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                  <button onClick={() => addSlot(day)} className="p-1 text-purple-400/60 hover:text-purple-300" title="إضافة">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                  </button>
                                  <div className="relative">
                                    <button
                                      onClick={() => { setCopyTimesDay(copyTimesDay === day ? null : day); setCopyTimesTarget([]); }}
                                      className={`p-1 rounded ${copyTimesDay === day ? 'text-purple-300 bg-purple-500/20' : 'text-purple-400/60 hover:text-purple-300'}`}
                                      title="نسخ"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </button>
                                    {copyTimesDay === day && (
                                      <div className="absolute right-0 top-full mt-1 bg-[#1a0a2e] border border-purple-500/30 rounded-xl p-3 shadow-xl z-20 min-w-[150px]">
                                        <p className="text-purple-400/60 text-xs mb-2">نسخ إلى...</p>
                                        {Object.entries(DAY_NAMES).filter(([d]) => d !== day).map(([d, n]) => (
                                          <label key={d} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-purple-500/10 rounded px-1">
                                            <input
                                              type="checkbox"
                                              checked={copyTimesTarget.includes(d)}
                                              onChange={(e) => e.target.checked ? setCopyTimesTarget([...copyTimesTarget, d]) : setCopyTimesTarget(copyTimesTarget.filter(t => t !== d))}
                                              className="w-3 h-3 rounded"
                                            />
                                            <span className="text-white text-sm">{n}</span>
                                          </label>
                                        ))}
                                        <button onClick={copyTimesToDays} disabled={copyTimesTarget.length === 0} className="w-full mt-2 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/30 text-white text-sm rounded">
                                          تطبيق
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* أزرار */}
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowWorkingHoursModal(false)} className="flex-1 px-4 py-2 bg-purple-900/50 text-purple-300 rounded-xl">إلغاء</button>
                  <button onClick={() => { saveSettings(); setShowWorkingHoursModal(false); }} disabled={savingSettings} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
                    {savingSettings ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </div>
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
