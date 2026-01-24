'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';

interface Employee {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
}

interface Settings {
  slot_duration: number;
  min_notice_hours: number;
  max_advance_days: number;
  meeting_title?: string;
}

interface AvailableSlot {
  datetime: string;
  duration: number;
  formatted_date: string;
  formatted_time: string;
}

interface BookingForm {
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
}

const DAYS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAYS_FULL_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [step, setStep] = useState<'select' | 'form' | 'success'>('select');
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [form, setForm] = useState<BookingForm>({
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: '',
  });

  // جلب الأوقات المتاحة
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60);

    try {
      const response = await fetch('/api/meetings/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: slug,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load available times');
      }

      setEmployee(data.employee || { id: slug, name: 'Jud' });
      setSettings(data.settings || { slot_duration: 30, min_notice_hours: 4, max_advance_days: 30 });
      setSlots(data.available_slots || []);
    } catch (err: any) {
      console.error('Error fetching slots:', err);
      // Set default values even on error
      setEmployee({ id: slug, name: 'Jud' });
      setSettings({ slot_duration: 30, min_notice_hours: 4, max_advance_days: 30 });
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // تجميع الأوقات حسب التاريخ (YYYY-MM-DD)
  const slotsByDateKey = useMemo(() => {
    return slots.reduce((acc, slot) => {
      const dateKey = slot.datetime.split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {} as Record<string, AvailableSlot[]>);
  }, [slots]);

  // التحقق إذا كان اليوم متاح
  const isDateAvailable = (date: Date) => {
    // استخدام التاريخ المحلي بدلاً من UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    return !!slotsByDateKey[dateKey];
  };

  // الحصول على أوقات اليوم المحدد
  const getTimeSlotsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    return slotsByDateKey[dateKey] || [];
  };

  // إنشاء أيام الشهر للتقويم
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    // أيام فارغة في البداية
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // أيام الشهر
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // حجز الاجتماع
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !employee) return;

    setSubmitting(true);
    setError(null);

    const meetingTitle = settings?.meeting_title || `${settings?.slot_duration || 30} Minute Meeting`;

    try {
      const response = await fetch('/api/meetings/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          datetime: selectedSlot.datetime,
          duration_minutes: selectedSlot.duration,
          client_name: form.client_name,
          client_email: form.client_email,
          client_phone: form.client_phone || undefined,
          subject: meetingTitle,
          notes: form.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل حجز الاجتماع');
      }

      setBookingResult(data.meeting);
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const meetingTitle = settings?.meeting_title || `اجتماع ${settings?.slot_duration || 30} دقيقة`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0a2e] to-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0a2e] to-[#0a0118] flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center max-w-md">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">خطأ</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const calendarDays = getCalendarDays();
  const timeSlotsForSelectedDate = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0a2e] to-[#0a0118] flex items-center justify-center py-8 px-4" dir="rtl">
      <div className="w-full max-w-5xl">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Step 1: Select Date & Time */}
        {step === 'select' && (
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex flex-col lg:flex-row">
              {/* Right Side - Meeting Info (RTL) */}
              <div className="lg:w-80 p-6 border-b lg:border-b-0 lg:border-l border-purple-500/20 order-1 lg:order-2">
                {/* Header like dashboard */}
                <div className="mb-6 flex items-center gap-4">
                  {/* Jud Logo */}
                  <div className="flex items-center border-l border-purple-500/30 pl-4">
                    <img src="/logo.png" alt="Jud" className="h-10" />
                  </div>
                  {/* Employee Name & Title */}
                  <div className="text-right flex-1">
                    <h1 
                      className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 whitespace-nowrap"
                      style={{ fontFamily: '"Codec Pro", sans-serif', fontWeight: 900 }}
                    >
                      دخيل العنزي
                    </h1>
                    <p className="text-purple-300/60 text-sm whitespace-nowrap">{employee?.title || 'المسؤول الرئيسي'}</p>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-4">{meetingTitle}</h2>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-purple-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{settings?.slot_duration || 30} دقيقة</span>
                  </div>
                  <div className="flex items-center gap-3 text-purple-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>سيتم إرسال تفاصيل الاجتماع عند التأكيد</span>
                  </div>
                </div>
              </div>

              {/* Left Side - Calendar & Times (RTL) */}
              <div className="flex-1 p-6 order-2 lg:order-1">
                <h3 className="text-lg font-semibold text-white mb-6 text-center">اختر التاريخ والوقت</h3>
                
                <div className="flex flex-col-reverse lg:flex-row-reverse gap-6">
                  {/* Time Slots - Right side in RTL */}
                  {selectedDate && (
                    <div className="min-w-[320px] border-l border-purple-500/20 pl-6">
                      <p className="text-white font-medium mb-3 text-sm text-center">
                        {DAYS_FULL_AR[selectedDate.getDay()]}، {selectedDate.getDate()} {MONTHS_AR[selectedDate.getMonth()]}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlotsForSelectedDate.length > 0 ? (
                          timeSlotsForSelectedDate.map((slot) => (
                            <button
                              key={slot.datetime}
                              onClick={() => setSelectedSlot(slot)}
                              className={`px-2 py-2.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap ${
                                selectedSlot?.datetime === slot.datetime
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-purple-900/30 text-purple-300 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/20'
                              }`}
                            >
                              {slot.formatted_time}
                            </button>
                          ))
                        ) : (
                          <p className="text-purple-400/60 text-sm text-center py-4 col-span-4">لا توجد أوقات متاحة</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Calendar - Left side in RTL */}
                  <div className="flex-1">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-full transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <span className="text-white font-medium min-w-[140px] text-center">
                        {MONTHS_AR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-full transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {DAYS_AR.map((day: string) => (
                        <div key={day} className="text-center text-purple-400/60 text-xs font-medium py-2">{day}</div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((date, index) => {
                        if (!date) {
                          return <div key={`empty-${index}`} className="p-2"></div>;
                        }
                        
                        const isAvailable = isDateAvailable(date);
                        const isPast = date < today;
                        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => {
                              if (isAvailable && !isPast) {
                                setSelectedDate(date);
                                setSelectedSlot(null);
                              }
                            }}
                            disabled={!isAvailable || isPast}
                            className={`w-10 h-10 text-sm rounded-full transition-all relative mx-auto flex items-center justify-center ${
                              isSelected
                                ? 'bg-purple-600 text-white'
                                : isAvailable && !isPast
                                  ? 'text-purple-300 hover:bg-purple-500/20 font-semibold'
                                  : 'text-purple-400/30 cursor-not-allowed'
                            }`}
                          >
                            {date.getDate()}
                            {isToday && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full"></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                {selectedSlot && (
                  <div className="flex justify-center mt-6 pt-6 border-t border-purple-500/20">
                    <button
                      onClick={() => setStep('form')}
                      className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all font-medium"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">أدخل بياناتك</h2>
              <button
                onClick={() => setStep('select')}
                className="text-purple-400 hover:text-white text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                تغيير الموعد
              </button>
            </div>

            {/* Selected Time Summary */}
            <div className="bg-purple-900/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">{selectedSlot?.formatted_date}</p>
                  <p className="text-purple-300 text-sm">{selectedSlot?.formatted_time} • {selectedSlot?.duration} دقيقة</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-1">الاسم *</label>
                  <input
                    type="text"
                    required
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500"
                    placeholder="أدخل اسمك"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    value={form.client_email}
                    onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500"
                    placeholder="example@email.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={form.client_phone}
                  onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500"
                  placeholder="+966xxxxxxxxx"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">ملاحظات إضافية (اختياري)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="أي معلومات إضافية تود مشاركتها..."
                />
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-xl transition-all font-medium"
                >
                  {submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Powered By Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-purple-400/60 text-sm">
          <span>بواسطة</span>
          <img src="/logo.png" alt="Jud" className="h-6 w-auto" />
        </div>

        {/* Step 3: Success */}
        {step === 'success' && bookingResult && (
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">تم الحجز بنجاح!</h2>
            <p className="text-purple-300 mb-6">تم إرسال تفاصيل الاجتماع إلى بريدك الإلكتروني</p>

            <div className="bg-purple-900/30 rounded-xl p-6 mb-6 text-right">
              <h3 className="text-white font-semibold mb-4">{meetingTitle}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-purple-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{new Date(bookingResult.datetime).toLocaleString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-3 text-purple-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{bookingResult.duration_minutes} دقيقة</span>
                </div>
                {bookingResult.google_meet_link && (
                  <div className="flex items-center gap-3 text-purple-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <a href={bookingResult.google_meet_link} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                      انضم عبر Google Meet
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={bookingResult.calendar_links?.google}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-lg text-sm transition-all border border-purple-500/30"
              >
                إضافة إلى Google Calendar
              </a>
              <a
                href={bookingResult.calendar_links?.outlook}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-lg text-sm transition-all border border-purple-500/30"
              >
                إضافة إلى Outlook
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
