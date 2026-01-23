# نظام الاجتماعات - التصميم المعماري

## نظرة عامة

نظام الاجتماعات يتيح للعملاء حجز اجتماعات مع فريق العمل عبر صفحة عامة، مع تكامل كامل مع Google Calendar.

---

## 1. Flow إنشاء الاجتماع

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         صفحة حجز الاجتماع (عامة)                            │
│                    /meetings/book/[employee_slug]                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. التحقق من Rate Limiting (IP-based + fingerprint)                       │
│  2. عرض الأوقات المتاحة من Google Calendar                                  │
│  3. إدخال بيانات العميل (الاسم، البريد، الهاتف، الموضوع)                    │
│  4. حماية reCAPTCHA v3                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POST /api/meetings/book                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Request:                                                                   │
│  {                                                                          │
│    employee_id: string,                                                     │
│    datetime: ISO8601,                                                       │
│    duration_minutes: 30 | 60,                                               │
│    client_name: string,                                                     │
│    client_email: string,                                                    │
│    client_phone?: string,                                                   │
│    subject: string,                                                         │
│    notes?: string,                                                          │
│    recaptcha_token: string                                                  │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API Validation Layer                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. التحقق من reCAPTCHA token (score >= 0.5)                               │
│  2. التحقق من Rate Limit (max 5 requests/hour per IP)                      │
│  3. التحقق من صحة البيانات (Zod schema)                                    │
│  4. التحقق من أن الموظف موجود ونشط                                         │
│  5. التحقق من أن الوقت المطلوب متاح                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Google Calendar Integration                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. استخدام Service Account للوصول لتقويم الموظف                           │
│  2. إنشاء Event في Google Calendar                                         │
│  3. إضافة العميل كـ attendee                                               │
│  4. إرسال دعوة تلقائية من Google                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Supabase Database                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  INSERT INTO meetings:                                                      │
│  - id, employee_id, client_name, client_email, client_phone                │
│  - subject, notes, datetime, duration_minutes                              │
│  - status: 'confirmed'                                                      │
│  - google_event_id, google_calendar_id                                     │
│  - created_at, confirmation_token                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Notifications                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. إشعار داخلي للموظف (في النظام)                                         │
│  2. بريد تأكيد للعميل (مع رابط إلغاء/إعادة جدولة)                          │
│  3. بريد إشعار للموظف                                                       │
│  4. تذكير قبل الاجتماع بـ 24 ساعة و 1 ساعة                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Flow إعادة الجدولة

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              صفحة إعادة الجدولة (عامة مع token)                             │
│           /meetings/reschedule/[meeting_id]?token=[token]                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. التحقق من صحة الـ token (JWT signed, not expired)                      │
│  2. التحقق من أن الاجتماع لم يُلغَ ولم ينتهِ                               │
│  3. التحقق من أن إعادة الجدولة مسموحة (قبل 24 ساعة على الأقل)              │
│  4. عرض الأوقات المتاحة الجديدة                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PUT /api/meetings/[id]/reschedule                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Request:                                                                   │
│  {                                                                          │
│    token: string,                                                           │
│    new_datetime: ISO8601,                                                   │
│    reason?: string                                                          │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Google Calendar Update                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. تحديث Event في Google Calendar                                         │
│  2. إرسال تحديث تلقائي للمدعوين                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Database Update                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  UPDATE meetings SET:                                                       │
│  - datetime = new_datetime                                                  │
│  - rescheduled_at = NOW()                                                   │
│  - reschedule_count = reschedule_count + 1                                 │
│                                                                             │
│  INSERT INTO meeting_history:                                               │
│  - meeting_id, action: 'rescheduled', old_datetime, new_datetime           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Notifications                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. إشعار داخلي للموظف                                                      │
│  2. بريد تأكيد للعميل بالموعد الجديد                                       │
│  3. بريد إشعار للموظف                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Flow الإلغاء

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  صفحة الإلغاء (عامة مع token)                               │
│              /meetings/cancel/[meeting_id]?token=[token]                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. التحقق من صحة الـ token                                                │
│  2. التحقق من أن الاجتماع لم يُلغَ مسبقاً                                  │
│  3. عرض تفاصيل الاجتماع وطلب تأكيد الإلغاء                                 │
│  4. طلب سبب الإلغاء (اختياري)                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DELETE /api/meetings/[id]/cancel                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Request:                                                                   │
│  {                                                                          │
│    token: string,                                                           │
│    reason?: string,                                                         │
│    cancelled_by: 'client' | 'employee'                                     │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Google Calendar Delete                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. حذف Event من Google Calendar                                           │
│  2. إرسال إشعار إلغاء تلقائي للمدعوين                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Database Update                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  UPDATE meetings SET:                                                       │
│  - status = 'cancelled'                                                     │
│  - cancelled_at = NOW()                                                     │
│  - cancellation_reason = reason                                            │
│  - cancelled_by = 'client' | 'employee'                                    │
│                                                                             │
│  INSERT INTO meeting_history:                                               │
│  - meeting_id, action: 'cancelled', reason                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Flow مزامنة التقويم

### 4.1 Pull (جلب الأوقات المتاحة)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GET /api/meetings/availability                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Query: employee_id, start_date, end_date                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Google Calendar FreeBusy API                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. جلب أوقات الانشغال من تقويم الموظف                                     │
│  2. جلب ساعات العمل المحددة للموظف من DB                                   │
│  3. حساب الأوقات المتاحة (working_hours - busy_times)                      │
│  4. تقسيم الأوقات إلى slots (30 دقيقة أو 60 دقيقة)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Response                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  {                                                                          │
│    available_slots: [                                                       │
│      { datetime: "2026-01-24T09:00:00Z", duration: 30 },                   │
│      { datetime: "2026-01-24T09:30:00Z", duration: 30 },                   │
│      ...                                                                    │
│    ]                                                                        │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Push (إنشاء/تحديث/حذف Events)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Google Calendar Events API                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  - events.insert(): إنشاء اجتماع جديد                                      │
│  - events.update(): تحديث اجتماع (إعادة جدولة)                             │
│  - events.delete(): حذف اجتماع (إلغاء)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 حدود المزامنة

| الحد | القيمة | السبب |
|------|--------|-------|
| Max events per day | 100 | حد Google API |
| FreeBusy range | 60 يوم | أداء + حد API |
| Sync interval | 5 دقائق | تجنب rate limiting |
| Retry attempts | 3 | مع exponential backoff |
| Token refresh | 55 دقيقة | قبل انتهاء الصلاحية |

---

## 5. Threat Model (نموذج التهديدات)

### 5.1 Abuse/Spam

| التهديد | الحماية |
|---------|---------|
| حجز متكرر من نفس IP | Rate limiting: 5 حجوزات/ساعة per IP |
| حجز بـ emails وهمية | التحقق من البريد عبر رابط تأكيد |
| Bots تحجز كل الأوقات | reCAPTCHA v3 + honeypot fields |
| DDoS على صفحة الحجز | Cloudflare + edge caching |
| إغراق الموظف بحجوزات | حد أقصى 10 اجتماعات/يوم per employee |

### 5.2 Authentication & Authorization

| التهديد | الحماية |
|---------|---------|
| تخمين token الإلغاء | JWT signed + UUID v4 + expiry |
| الوصول لاجتماعات الآخرين | RLS policies في Supabase |
| تزوير employee_id | التحقق من وجود الموظف + نشاطه |
| Session hijacking | HttpOnly cookies + SameSite=Strict |

### 5.3 Token Leakage

| التهديد | الحماية |
|---------|---------|
| تسريب Google credentials | Service Account في env variables فقط |
| تسريب JWT secret | متغير بيئة + rotation كل 90 يوم |
| تسريب tokens في logs | عدم تسجيل tokens في أي log |
| تسريب في URL | استخدام POST للعمليات الحساسة |

### 5.4 Data Protection

| التهديد | الحماية |
|---------|---------|
| تسريب بيانات العملاء | RLS + encryption at rest |
| GDPR violations | حذف البيانات بعد 90 يوم من انتهاء الاجتماع |
| XSS في notes | sanitization + CSP headers |
| SQL injection | Parameterized queries (Supabase) |

---

## 6. مخطط قاعدة البيانات (مبدئي)

```sql
-- جدول الاجتماعات الرئيسي
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES admin_users(id),
  
  -- بيانات العميل
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  
  -- تفاصيل الاجتماع
  subject TEXT NOT NULL,
  notes TEXT,
  datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  
  -- الحالة
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled, completed, no_show
  
  -- Google Calendar
  google_event_id TEXT,
  google_calendar_id TEXT,
  
  -- Tokens
  confirmation_token TEXT UNIQUE,
  cancel_token TEXT UNIQUE,
  
  -- Metadata
  reschedule_count INTEGER DEFAULT 0,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by TEXT, -- client, employee
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول سجل التغييرات
CREATE TABLE meeting_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- created, rescheduled, cancelled, completed
  old_datetime TIMESTAMPTZ,
  new_datetime TIMESTAMPTZ,
  reason TEXT,
  performed_by TEXT, -- client, employee, system
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول إعدادات الموظف للاجتماعات
CREATE TABLE employee_meeting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE NOT NULL REFERENCES admin_users(id),
  
  -- ساعات العمل
  working_hours JSONB DEFAULT '{"sun":{"start":"09:00","end":"17:00"},...}',
  
  -- إعدادات الحجز
  slot_duration INTEGER DEFAULT 30, -- 30 or 60 minutes
  buffer_before INTEGER DEFAULT 15, -- minutes before meeting
  buffer_after INTEGER DEFAULT 15, -- minutes after meeting
  max_advance_days INTEGER DEFAULT 30, -- how far in advance can book
  min_notice_hours INTEGER DEFAULT 24, -- minimum notice required
  
  -- Google Calendar
  google_calendar_id TEXT,
  
  -- حدود
  max_meetings_per_day INTEGER DEFAULT 10,
  
  -- الحالة
  is_accepting_meetings BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول Rate Limiting
CREATE TABLE meeting_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  fingerprint TEXT,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. متغيرات البيئة المطلوبة

```env
# Google Calendar (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=meetings@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# reCAPTCHA
RECAPTCHA_SECRET_KEY=6Lc...

# JWT for meeting tokens
MEETING_JWT_SECRET=your-secret-key

# Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=meetings@example.com
SMTP_PASS=...
```

---

## 8. الأمان والأداء

### 8.1 Security Headers

```typescript
// middleware.ts
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.google.com/recaptcha/",
};
```

### 8.2 Rate Limiting Strategy

```typescript
// Per IP: 5 booking requests per hour
// Per Employee: 10 meetings per day
// Global: 1000 bookings per hour (system-wide)
```

### 8.3 Caching Strategy

```typescript
// Availability: Cache for 5 minutes (invalidate on booking)
// Employee settings: Cache for 1 hour
// Static pages: Edge cache with revalidation
```
