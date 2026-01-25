'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useBranding } from '@/contexts/BrandingContext';

interface Employee {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
}

interface MeetingType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  duration_minutes: number;
  color: string;
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
  // Honeypot field for spam protection
  website: string;
}

export default function PublicBookingPage() {
  const { branding } = useBranding();
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [step, setStep] = useState<'type' | 'calendar' | 'time' | 'form' | 'success'>('type');
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [loadStartTime] = useState(Date.now());

  const [form, setForm] = useState<BookingForm>({
    client_name: '',
    client_email: '',
    client_phone: '',
    subject: '',
    notes: '',
    website: '', // Honeypot
  });

  // أنواع الاجتماعات الافتراضية
  const DEFAULT_TYPES: MeetingType[] = [
    {
      id: '1',
      name: 'استشارة سريعة',
      slug: 'quick-consultation',
      description: 'اجتماع قصير للأسئلة السريعة',
      duration_minutes: 15,
      color: '#10B981',
    },
    {
      id: '2',
      name: 'اجتماع عادي',
      slug: 'standard-meeting',
      description: 'اجتماع لمناقشة المواضيع العامة',
      duration_minutes: 30,
      color: '#6366F1',
    },
    {
      id: '3',
      name: 'اجتماع مطوّل',
      slug: 'extended-meeting',
      description: 'اجتماع للمناقشات التفصيلية',
      duration_minutes: 60,
      color: '#8B5CF6',
    },
  ];

  // جلب بيانات الموظف والأنواع
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // جلب الموظف بالـ slug
      const employeeRes = await fetch(`/api/public/employee/${slug}`);
      if (!employeeRes.ok) {
        throw new Error('الصفحة غير موجودة');
      }
      const employeeData = await employeeRes.json();
      setEmployee(employeeData.employee);

      // جلب أنواع الاجتماعات
      try {
        const typesRes = await fetch('/api/public/meeting-types');
        if (typesRes.ok) {
          const typesData = await typesRes.json();
          const types = typesData.types?.length > 0 ? typesData.types : DEFAULT_TYPES;
          setMeetingTypes(types);
          
          // إذا كان هناك نوع واحد فقط، اختره تلقائياً
          if (types.length === 1) {
            setSelectedType(types[0]);
            setStep('calendar');
          }
        } else {
          setMeetingTypes(DEFAULT_TYPES);
        }
      } catch {
        setMeetingTypes(DEFAULT_TYPES);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // جلب الأوقات المتاحة
  const fetchSlots = useCallback(async () => {
    if (!employee || !selectedType) return;

    setLoading(true);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    try {
      const response = await fetch('/api/meetings/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          duration: selectedType.duration_minutes,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSlots(data.available_slots || []);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoading(false);
    }
  }, [employee, selectedType]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedType && step === 'calendar') {
      fetchSlots();
    }
  }, [selectedType, step, fetchSlots]);

  // تجميع الأوقات حسب التاريخ
  const slotsByDate = slots.reduce((acc, slot) => {
    const date = slot.formatted_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, AvailableSlot[]>);

  const dates = Object.keys(slotsByDate);

  // حجز الاجتماع
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Spam protection: honeypot check
    if (form.website) {
      // Bot detected
      setStep('success');
      setBookingResult({ fake: true });
      return;
    }

    // Spam protection: time check (too fast = bot)
    if (Date.now() - loadStartTime < 3000) {
      setError('الرجاء الانتظار قليلاً');
      return;
    }

    if (!selectedSlot || !employee || !selectedType) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/meetings/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          datetime: selectedSlot.datetime,
          duration_minutes: selectedType.duration_minutes,
          meeting_type_id: selectedType.id,
          client_name: form.client_name,
          client_email: form.client_email,
          client_phone: form.client_phone || undefined,
          subject: form.subject || `${selectedType.name} مع ${form.client_name}`,
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

  const goBack = () => {
    if (step === 'calendar') setStep('type');
    else if (step === 'time') setStep('calendar');
    else if (step === 'form') setStep('time');
  };

  if (loading && !employee) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 text-center max-w-md relative z-10">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-white mb-2">الصفحة غير موجودة</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] py-8 px-4 relative overflow-hidden" dir="rtl">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header - مثل صفحة تقويمي */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="text-right">
            <h1 className="text-3xl font-bold text-purple-400">حجز اجتماع</h1>
            <p className="text-purple-300/60 text-sm">احجز موعدك بسهولة وسرعة</p>
          </div>
          <div className="border-r border-purple-500/30 h-12"></div>
          <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Jud'} className="h-12 w-auto" onError={(e) => { 
            const parent = e.currentTarget.parentElement;
            if (parent) {
              e.currentTarget.outerHTML = '<div class="text-3xl font-bold"><span class="text-white">J</span><span class="text-yellow-500">u</span><span class="text-white">d</span></div>';
            }
          }} />
        </div>

        {/* Employee Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 text-right">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide">{employee?.name}</h2>
              {employee?.title && (
                <p className="text-purple-400 text-sm mt-1">
                  {employee.title === 'super_admin' ? 'المسؤول الرئيسي' : 
                   employee.title === 'admin' ? 'مدير' :
                   employee.title === 'team_leader' ? 'قائد فريق' :
                   employee.title === 'employee' ? 'موظف' : employee.title}
                </p>
              )}
            </div>
            {employee?.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-14 h-14 rounded-xl border-2 border-purple-500/30 object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-xl font-bold text-white">
                {employee?.name?.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {[
            { key: 'type', label: 'النوع', icon: '📋' },
            { key: 'calendar', label: 'اليوم', icon: '📅' },
            { key: 'time', label: 'الوقت', icon: '⏰' },
            { key: 'form', label: 'البيانات', icon: '✏️' },
            { key: 'success', label: 'تم', icon: '✓' },
          ].map((s, i) => {
            const stepIndex = ['type', 'calendar', 'time', 'form', 'success'].indexOf(step);
            const isActive = step === s.key;
            const isCompleted = stepIndex > i;
            return (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                  isActive ? 'bg-purple-600 text-white' :
                  isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-purple-900/30 text-purple-400/50'
                }`}>
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < 4 && <div className={`w-4 h-0.5 mx-1 ${isCompleted ? 'bg-green-500/50' : 'bg-purple-900/50'}`} />}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 mb-6 text-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Step 1: Select Meeting Type */}
        {step === 'type' && (
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 text-center flex items-center justify-center gap-2">
              <span className="text-2xl">📋</span>
              اختر نوع الاجتماع
            </h2>
            <div className="space-y-3">
              {meetingTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type);
                    setStep('calendar');
                  }}
                  className="w-full p-4 bg-purple-900/20 hover:bg-purple-800/30 border border-purple-500/20 hover:border-purple-500/40 rounded-xl text-right transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-2 h-14 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold group-hover:text-purple-300 transition-colors text-lg">
                        {type.name}
                      </h3>
                      {type.description && (
                        <p className="text-purple-400/60 text-sm mt-1">{type.description}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-white font-bold text-lg">{type.duration_minutes}</div>
                      <div className="text-purple-400/60 text-xs">دقيقة</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Date */}
        {step === 'calendar' && (
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={goBack} className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 hover:text-white rounded-lg text-sm transition-all">
                <span>←</span> رجوع
              </button>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-xl">📅</span>
                اختر اليوم
              </h2>
              <div className="w-20"></div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-purple-400/60">جاري تحميل الأوقات...</p>
              </div>
            ) : dates.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-20 h-20 bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📅</span>
                </div>
                <p className="text-purple-400/60 text-lg">لا توجد أوقات متاحة حالياً</p>
                <p className="text-purple-400/40 text-sm mt-2">يرجى المحاولة لاحقاً</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {dates.slice(0, 12).map((date) => (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      setStep('time');
                    }}
                    className="p-4 bg-purple-900/20 hover:bg-purple-800/30 border border-purple-500/20 hover:border-purple-500/40 rounded-xl text-center transition-all group"
                  >
                    <div className="text-white font-semibold group-hover:text-purple-300 transition-colors">{date.split('،')[0]}</div>
                    <div className="text-purple-400/60 text-sm mt-1">{date.split('،')[1]?.trim()}</div>
                    <div className="mt-3 px-2 py-1 bg-purple-600/20 rounded-lg">
                      <span className="text-purple-400 text-xs">{slotsByDate[date]?.length} وقت متاح</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Time */}
        {step === 'time' && selectedDate && (
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={goBack} className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 hover:text-white rounded-lg text-sm transition-all">
                <span>←</span> رجوع
              </button>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-xl">⏰</span>
                اختر الوقت
              </h2>
              <div className="w-20"></div>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/30 rounded-xl">
                <span className="text-purple-400">📅</span>
                <span className="text-white font-medium">{selectedDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slotsByDate[selectedDate]?.map((slot) => (
                <button
                  key={slot.datetime}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep('form');
                  }}
                  className="px-4 py-3 bg-purple-900/20 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-500 rounded-xl text-white font-medium transition-all"
                >
                  {slot.formatted_time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Form */}
        {step === 'form' && (
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={goBack} className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 hover:text-white rounded-lg text-sm transition-all">
                <span>←</span> رجوع
              </button>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-xl">✏️</span>
                بياناتك
              </h2>
              <div className="w-20"></div>
            </div>

            {/* Summary */}
            <div className="bg-purple-900/30 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">📅</span>
                  <span className="text-white">{selectedDate}</span>
                </div>
                <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">⏰</span>
                  <span className="text-white">{selectedSlot?.formatted_time}</span>
                </div>
                <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">⏱️</span>
                  <span className="text-purple-300">{selectedType?.duration_minutes} دقيقة</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot - hidden from users */}
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                style={{ position: 'absolute', left: '-9999px' }}
                tabIndex={-1}
                autoComplete="off"
              />

              <div>
                <label className="block text-purple-300 text-sm mb-2 font-medium">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:bg-purple-900/30 transition-all"
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2 font-medium">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={form.client_email}
                  onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:bg-purple-900/30 transition-all"
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2 font-medium">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={form.client_phone}
                  onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:bg-purple-900/30 transition-all"
                  placeholder="+966xxxxxxxxx"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2 font-medium">ملاحظات (اختياري)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:bg-purple-900/30 transition-all resize-none"
                  placeholder="أي معلومات إضافية تود مشاركتها..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-purple-600/50 disabled:to-purple-700/50 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold text-lg shadow-lg shadow-purple-500/20"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    جاري الحجز...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    تأكيد الحجز
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && bookingResult && !bookingResult.fake && (
          <div className="bg-white/5 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✓</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">تم الحجز بنجاح! 🎉</h2>
            <p className="text-purple-300 mb-6">تم إرسال تفاصيل الاجتماع إلى بريدك الإلكتروني</p>

            <div className="bg-purple-900/30 rounded-xl p-5 mb-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-purple-500/20">
                  <span className="text-purple-400 flex items-center gap-2"><span>📅</span> التاريخ</span>
                  <span className="text-white font-medium">{new Date(bookingResult.datetime).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-purple-500/20">
                  <span className="text-purple-400 flex items-center gap-2"><span>⏰</span> الوقت</span>
                  <span className="text-white font-medium">{new Date(bookingResult.datetime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-purple-500/20">
                  <span className="text-purple-400 flex items-center gap-2"><span>⏱️</span> المدة</span>
                  <span className="text-white font-medium">{bookingResult.duration_minutes} دقيقة</span>
                </div>
                {bookingResult.google_meet_link && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-purple-400 flex items-center gap-2"><span>📹</span> رابط الاجتماع</span>
                    <a href={bookingResult.google_meet_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">
                      Google Meet ↗
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {bookingResult.calendar_links?.google && (
                <a
                  href={bookingResult.calendar_links.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all"
                >
                  📅 إضافة للتقويم
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-2 text-purple-400/60 text-sm">
            <span>مدعوم من</span>
            <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Jud'} className="h-5 w-auto opacity-60" onError={(e) => { e.currentTarget.outerHTML = '<span class="text-purple-400 font-bold">Jud</span>'; }} />
          </div>
        </div>
      </div>
    </div>
  );
}
