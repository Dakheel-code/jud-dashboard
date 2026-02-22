'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useBranding } from '@/contexts/BrandingContext';

interface NotifSettings {
  tasks_assigned: boolean; tasks_reassigned: boolean; tasks_completed: boolean;
  tasks_overdue: boolean; tasks_help_request: boolean; tasks_help_response: boolean;
  tasks_mention: boolean; tasks_comment: boolean;
  announcements_normal: boolean; announcements_urgent: boolean; announcements_scheduled: boolean;
  attendance_checkin: boolean; attendance_checkout: boolean; attendance_leave_request: boolean;
  attendance_leave_approved: boolean; attendance_leave_rejected: boolean;
  billing_invoice_generated: boolean; billing_salary_generated: boolean; billing_payment_due: boolean;
  stores_new: boolean; stores_completed: boolean; stores_milestone: boolean;
  system_login: boolean; system_updates: boolean; system_errors: boolean;
  channel_inapp: boolean; channel_email: boolean; channel_slack: boolean;
  sound_enabled: boolean; sound_volume: number; badge_enabled: boolean;
  popup_enabled: boolean; popup_duration: number;
  quiet_hours_enabled: boolean; quiet_hours_start: string; quiet_hours_end: string;
  digest_enabled: boolean; digest_frequency: string;
}

const DEFAULTS: NotifSettings = {
  tasks_assigned: true, tasks_reassigned: true, tasks_completed: true,
  tasks_overdue: true, tasks_help_request: true, tasks_help_response: true,
  tasks_mention: true, tasks_comment: true,
  announcements_normal: true, announcements_urgent: true, announcements_scheduled: true,
  attendance_checkin: true, attendance_checkout: true, attendance_leave_request: true,
  attendance_leave_approved: true, attendance_leave_rejected: true,
  billing_invoice_generated: true, billing_salary_generated: true, billing_payment_due: true,
  stores_new: true, stores_completed: true, stores_milestone: true,
  system_login: false, system_updates: true, system_errors: true,
  channel_inapp: true, channel_email: false, channel_slack: false,
  sound_enabled: true, sound_volume: 80, badge_enabled: true,
  popup_enabled: true, popup_duration: 5,
  quiet_hours_enabled: false, quiet_hours_start: '22:00', quiet_hours_end: '08:00',
  digest_enabled: false, digest_frequency: 'daily',
};

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
        value ? 'bg-purple-600' : 'bg-purple-900/50 border border-purple-500/30'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${value ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}

function SectionCard({ icon, title, color, children }: { icon: string; title: string; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${color}`}>{icon}</div>
          <span className="text-white font-semibold">{title}</span>
        </div>
        <svg className={`w-5 h-5 text-purple-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-purple-500/10 pt-4">{children}</div>}
    </div>
  );
}

function Row({ label, desc, value, onChange, disabled }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        {desc && <p className="text-purple-400/60 text-xs mt-0.5">{desc}</p>}
      </div>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function NotificationSettingsClient() {
  const { branding } = useBranding();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('admin_user');
    if (stored) {
      try { setUserId(JSON.parse(stored)?.id || null); } catch {}
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notification-settings?user_id=${userId}`);
      const data = await res.json();
      setSettings({ ...DEFAULTS, ...data.settings });
    } catch {}
    setLoading(false);
  }, [userId]);

  useEffect(() => { if (userId) fetchSettings(); else setLoading(false); }, [userId, fetchSettings]);

  const set = (key: keyof NotifSettings, val: boolean | number | string) =>
    setSettings(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await fetch('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const enableAll = () => {
    const all = Object.fromEntries(
      Object.entries(settings).map(([k, v]) => [k, typeof v === 'boolean' ? true : v])
    ) as NotifSettings;
    setSettings(all);
  };

  const disableAll = () => {
    const none = Object.fromEntries(
      Object.entries(settings).map(([k, v]) => [k, typeof v === 'boolean' ? false : v])
    ) as NotifSettings;
    setSettings(none);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0118]" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/settings" className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-3">
              {branding.logo && <img src={branding.logo} alt="" className="w-10 h-10 object-contain" />}
              <div>
                <h1 className="text-white text-xl font-bold">إعدادات الإشعارات</h1>
                <p className="text-purple-400/60 text-sm">تحكم كامل بكل أنواع الإشعارات</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={disableAll} className="px-3 py-1.5 text-xs text-purple-400 hover:text-white border border-purple-500/30 hover:border-purple-500/60 rounded-lg transition-all">
              إيقاف الكل
            </button>
            <button onClick={enableAll} className="px-3 py-1.5 text-xs text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-500/60 rounded-lg transition-all">
              تفعيل الكل
            </button>
          </div>
        </div>

        <div className="space-y-4">

          {/* ===== قنوات الإرسال ===== */}
          <SectionCard icon="📡" title="قنوات الإرسال" color="bg-blue-500/20">
            <Row label="داخل التطبيق" desc="إشعارات في نافذة الجرس" value={settings.channel_inapp} onChange={v => set('channel_inapp', v)} />
            <Row label="البريد الإلكتروني" desc="إرسال إشعارات على الإيميل" value={settings.channel_email} onChange={v => set('channel_email', v)} />
            <Row label="Slack" desc="إرسال إشعارات لقناة Slack" value={settings.channel_slack} onChange={v => set('channel_slack', v)} />
          </SectionCard>

          {/* ===== المهام ===== */}
          <SectionCard icon="✅" title="إشعارات المهام" color="bg-purple-500/20">
            <Row label="تعيين مهمة جديدة" desc="عند تعيين مهمة لك" value={settings.tasks_assigned} onChange={v => set('tasks_assigned', v)} />
            <Row label="إعادة تعيين مهمة" desc="عند نقل مهمة من موظف لآخر" value={settings.tasks_reassigned} onChange={v => set('tasks_reassigned', v)} />
            <Row label="إتمام مهمة" desc="عند إنجاز مهمة مسندة لك" value={settings.tasks_completed} onChange={v => set('tasks_completed', v)} />
            <Row label="مهام متأخرة" desc="تنبيه عند تجاوز موعد التسليم" value={settings.tasks_overdue} onChange={v => set('tasks_overdue', v)} />
            <Row label="طلب مساعدة" desc="عند طلب أحد المساعدة في مهمة" value={settings.tasks_help_request} onChange={v => set('tasks_help_request', v)} />
            <Row label="رد على طلب مساعدة" desc="عند الرد على طلب مساعدتك" value={settings.tasks_help_response} onChange={v => set('tasks_help_response', v)} />
            <Row label="الإشارة إليك" desc="عند ذكر اسمك في تعليق" value={settings.tasks_mention} onChange={v => set('tasks_mention', v)} />
            <Row label="تعليقات المهام" desc="عند إضافة تعليق على مهمة تتابعها" value={settings.tasks_comment} onChange={v => set('tasks_comment', v)} />
          </SectionCard>

          {/* ===== التعاميم ===== */}
          <SectionCard icon="📢" title="إشعارات التعاميم" color="bg-blue-500/20">
            <Row label="تعاميم عادية" desc="التعاميم الاعتيادية" value={settings.announcements_normal} onChange={v => set('announcements_normal', v)} />
            <Row label="تعاميم عاجلة" desc="التعاميم ذات الأولوية العالية" value={settings.announcements_urgent} onChange={v => set('announcements_urgent', v)} />
            <Row label="تعاميم مجدولة" desc="التعاميم المبرمجة مسبقاً" value={settings.announcements_scheduled} onChange={v => set('announcements_scheduled', v)} />
          </SectionCard>

          {/* ===== الحضور ===== */}
          <SectionCard icon="🕐" title="إشعارات الحضور والإجازات" color="bg-green-500/20">
            <Row label="تسجيل حضور" desc="تأكيد تسجيل الحضور" value={settings.attendance_checkin} onChange={v => set('attendance_checkin', v)} />
            <Row label="تسجيل انصراف" desc="تأكيد تسجيل الانصراف" value={settings.attendance_checkout} onChange={v => set('attendance_checkout', v)} />
            <Row label="طلب إجازة جديد" desc="عند تقديم طلب إجازة" value={settings.attendance_leave_request} onChange={v => set('attendance_leave_request', v)} />
            <Row label="موافقة على الإجازة" desc="عند الموافقة على طلب إجازتك" value={settings.attendance_leave_approved} onChange={v => set('attendance_leave_approved', v)} />
            <Row label="رفض الإجازة" desc="عند رفض طلب إجازتك" value={settings.attendance_leave_rejected} onChange={v => set('attendance_leave_rejected', v)} />
          </SectionCard>

          {/* ===== الفوترة ===== */}
          <SectionCard icon="💰" title="إشعارات الفوترة والرواتب" color="bg-amber-500/20">
            <Row label="توليد فاتورة" desc="عند إنشاء فاتورة شهرية جديدة" value={settings.billing_invoice_generated} onChange={v => set('billing_invoice_generated', v)} />
            <Row label="توليد الراتب" desc="عند إنشاء كشف الراتب الشهري" value={settings.billing_salary_generated} onChange={v => set('billing_salary_generated', v)} />
            <Row label="تذكير الدفع" desc="عند اقتراب موعد استحقاق الدفع" value={settings.billing_payment_due} onChange={v => set('billing_payment_due', v)} />
          </SectionCard>

          {/* ===== المتاجر ===== */}
          <SectionCard icon="🏪" title="إشعارات المتاجر" color="bg-pink-500/20">
            <Row label="متجر جديد" desc="عند إضافة متجر جديد للنظام" value={settings.stores_new} onChange={v => set('stores_new', v)} />
            <Row label="إتمام المتجر" desc="عند اكتمال إعداد المتجر" value={settings.stores_completed} onChange={v => set('stores_completed', v)} />
            <Row label="إنجاز مرحلة" desc="عند الوصول لنقطة تقدم مهمة" value={settings.stores_milestone} onChange={v => set('stores_milestone', v)} />
          </SectionCard>

          {/* ===== النظام ===== */}
          <SectionCard icon="⚙️" title="إشعارات النظام" color="bg-slate-500/20">
            <Row label="تسجيل دخول جديد" desc="عند تسجيل الدخول من جهاز جديد" value={settings.system_login} onChange={v => set('system_login', v)} />
            <Row label="تحديثات النظام" desc="عند إصدار تحديث جديد" value={settings.system_updates} onChange={v => set('system_updates', v)} />
            <Row label="أخطاء النظام" desc="عند حدوث خطأ يستوجب الانتباه" value={settings.system_errors} onChange={v => set('system_errors', v)} />
          </SectionCard>

          {/* ===== الصوت والمظهر ===== */}
          <SectionCard icon="🔔" title="الصوت والمظهر" color="bg-indigo-500/20">
            <Row label="تفعيل الصوت" desc="تشغيل صوت عند وصول إشعار" value={settings.sound_enabled} onChange={v => set('sound_enabled', v)} />
            {settings.sound_enabled && (
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-white text-sm font-medium">مستوى الصوت</p>
                  <p className="text-purple-400/60 text-xs mt-0.5">{settings.sound_volume}%</p>
                </div>
                <input
                  type="range" min={0} max={100} value={settings.sound_volume}
                  onChange={e => set('sound_volume', Number(e.target.value))}
                  className="w-32 accent-purple-500"
                />
              </div>
            )}
            <Row label="شارة العدد" desc="إظهار عدد الإشعارات غير المقروءة" value={settings.badge_enabled} onChange={v => set('badge_enabled', v)} />
            <Row label="نافذة منبثقة" desc="إظهار نافذة صغيرة عند وصول إشعار" value={settings.popup_enabled} onChange={v => set('popup_enabled', v)} />
            {settings.popup_enabled && (
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-white text-sm font-medium">مدة ظهور النافذة</p>
                  <p className="text-purple-400/60 text-xs mt-0.5">{settings.popup_duration} ثوانٍ</p>
                </div>
                <input
                  type="range" min={2} max={15} value={settings.popup_duration}
                  onChange={e => set('popup_duration', Number(e.target.value))}
                  className="w-32 accent-purple-500"
                />
              </div>
            )}
          </SectionCard>

          {/* ===== ساعات الهدوء ===== */}
          <SectionCard icon="🌙" title="ساعات الهدوء" color="bg-slate-600/20">
            <Row label="تفعيل ساعات الهدوء" desc="إيقاف الإشعارات في أوقات محددة" value={settings.quiet_hours_enabled} onChange={v => set('quiet_hours_enabled', v)} />
            {settings.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-purple-400/60 text-xs mb-1 block">من الساعة</label>
                  <input
                    type="time" value={settings.quiet_hours_start}
                    onChange={e => set('quiet_hours_start', e.target.value)}
                    className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-purple-400/60 text-xs mb-1 block">إلى الساعة</label>
                  <input
                    type="time" value={settings.quiet_hours_end}
                    onChange={e => set('quiet_hours_end', e.target.value)}
                    className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </SectionCard>

          {/* ===== ملخص يومي ===== */}
          <SectionCard icon="📋" title="الملخص الدوري" color="bg-teal-500/20">
            <Row label="تفعيل الملخص الدوري" desc="استلام ملخص بالإشعارات بدلاً من كل إشعار منفرد" value={settings.digest_enabled} onChange={v => set('digest_enabled', v)} />
            {settings.digest_enabled && (
              <div className="pt-2">
                <label className="text-purple-400/60 text-xs mb-2 block">تكرار الملخص</label>
                <div className="flex gap-2">
                  {[['hourly', 'كل ساعة'], ['daily', 'يومي'], ['weekly', 'أسبوعي']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => set('digest_frequency', val)}
                      className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                        settings.digest_frequency === val
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

        </div>

        {/* Save Button */}
        <div className="sticky bottom-6 mt-6 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center gap-2 ${
              saved
                ? 'bg-green-600 shadow-green-500/30'
                : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 shadow-purple-500/30'
            } disabled:opacity-60`}
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
            ) : saved ? (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> تم الحفظ</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> حفظ الإعدادات</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
