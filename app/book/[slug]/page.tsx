'use client';

import { useState, useEffect, useCallback } from 'react';
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
  subject: string;
  notes: string;
}

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [step, setStep] = useState<'select' | 'form' | 'success'>('select');
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  const [form, setForm] = useState<BookingForm>({
    client_name: '',
    client_email: '',
    client_phone: '',
    subject: '',
    notes: '',
  });

  // جلب معرف الموظف من الـ slug
  const fetchEmployeeBySlug = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/users?booking_slug=${slug}`);
      if (!response.ok) {
        throw new Error('الموظف غير موجود');
      }
      const data = await response.json();
      return data.user?.id;
    } catch {
      // محاولة استخدام الـ slug كـ ID مباشرة
      return slug;
    }
  }, [slug]);

  // جلب الأوقات المتاحة
  const fetchSlots = useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    try {
      const response = await fetch('/api/meetings/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل جلب الأوقات المتاحة');
      }

      setEmployee(data.employee);
      setSettings(data.settings);
      setSlots(data.available_slots || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const employeeId = await fetchEmployeeBySlug();
      if (employeeId) {
        await fetchSlots(employeeId);
      }
    };
    init();
  }, [fetchEmployeeBySlug, fetchSlots]);

  // تجميع الأوقات حسب التاريخ
  const slotsByDate = slots.reduce((acc, slot) => {
    const date = slot.formatted_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, AvailableSlot[]>);

  const dates = Object.keys(slotsByDate);

  // حجز الاجتماع
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !employee) return;

    setSubmitting(true);
    setError(null);

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
          subject: form.subject,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {employee?.avatar ? (
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-purple-500/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-purple-600 flex items-center justify-center text-3xl font-bold text-white">
              {employee?.name?.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-white mb-1">{employee?.name}</h1>
          {employee?.title && (
            <p className="text-purple-300">{employee.title}</p>
          )}
          <p className="text-purple-400/60 mt-2">احجز اجتماعاً</p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === 'select' ? 'text-purple-400' : 'text-purple-400/40'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select' ? 'bg-purple-600' : step === 'form' || step === 'success' ? 'bg-green-600' : 'bg-purple-900'}`}>
              {step === 'form' || step === 'success' ? '✓' : '1'}
            </div>
            <span className="hidden sm:inline">اختر الموعد</span>
          </div>
          <div className="w-12 h-px bg-purple-500/30"></div>
          <div className={`flex items-center gap-2 ${step === 'form' ? 'text-purple-400' : 'text-purple-400/40'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'form' ? 'bg-purple-600' : step === 'success' ? 'bg-green-600' : 'bg-purple-900'}`}>
              {step === 'success' ? '✓' : '2'}
            </div>
            <span className="hidden sm:inline">بياناتك</span>
          </div>
          <div className="w-12 h-px bg-purple-500/30"></div>
          <div className={`flex items-center gap-2 ${step === 'success' ? 'text-green-400' : 'text-purple-400/40'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'success' ? 'bg-green-600' : 'bg-purple-900'}`}>
              {step === 'success' ? '✓' : '3'}
            </div>
            <span className="hidden sm:inline">تأكيد</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Step 1: Select Time */}
        {step === 'select' && (
          <div className="bg-purple-950/40 border border-purple-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">اختر الموعد المناسب</h2>
            
            {dates.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-purple-400/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-purple-400/60">لا توجد أوقات متاحة حالياً</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Date Selection */}
                <div>
                  <label className="block text-purple-300 text-sm mb-2">اختر اليوم</label>
                  <div className="flex flex-wrap gap-2">
                    {dates.slice(0, 14).map((date) => (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          selectedDate === date
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                        }`}
                      >
                        {date.split('،')[0]}
                        <span className="block text-xs opacity-70">{date.split('،')[1]?.trim()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div>
                    <label className="block text-purple-300 text-sm mb-2">اختر الوقت</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slotsByDate[selectedDate]?.map((slot) => (
                        <button
                          key={slot.datetime}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedSlot?.datetime === slot.datetime
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                          }`}
                        >
                          {slot.formatted_time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                {selectedSlot && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep('form')}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all flex items-center gap-2"
                    >
                      التالي
                      <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <div className="bg-purple-950/40 border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">أدخل بياناتك</h2>
              <button
                onClick={() => setStep('select')}
                className="text-purple-400 hover:text-white text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                  <label className="block text-purple-300 text-sm mb-1">الاسم الكامل *</label>
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
                  <label className="block text-purple-300 text-sm mb-1">البريد الإلكتروني *</label>
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
                <label className="block text-purple-300 text-sm mb-1">رقم الهاتف (اختياري)</label>
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
                <label className="block text-purple-300 text-sm mb-1">موضوع الاجتماع *</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500"
                  placeholder="ما هو موضوع الاجتماع؟"
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-1">ملاحظات إضافية (اختياري)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="أي معلومات إضافية تود مشاركتها..."
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-xl transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      جاري الحجز...
                    </>
                  ) : (
                    <>
                      تأكيد الحجز
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && bookingResult && (
          <div className="bg-purple-950/40 border border-purple-500/20 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">تم الحجز بنجاح!</h2>
            <p className="text-purple-300 mb-6">تم إرسال تفاصيل الاجتماع إلى بريدك الإلكتروني</p>

            <div className="bg-purple-900/30 rounded-xl p-6 mb-6 text-right">
              <h3 className="text-white font-semibold mb-4">تفاصيل الاجتماع</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-400">الموضوع:</span>
                  <span className="text-white">{bookingResult.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">التاريخ والوقت:</span>
                  <span className="text-white">{new Date(bookingResult.datetime).toLocaleString('ar-SA')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">المدة:</span>
                  <span className="text-white">{bookingResult.duration_minutes} دقيقة</span>
                </div>
                {bookingResult.google_meet_link && (
                  <div className="flex justify-between">
                    <span className="text-purple-400">رابط الاجتماع:</span>
                    <a href={bookingResult.google_meet_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      Google Meet
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
                className="px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-lg text-sm transition-all"
              >
                إضافة إلى Google Calendar
              </a>
              <a
                href={bookingResult.calendar_links?.outlook}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-lg text-sm transition-all"
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
