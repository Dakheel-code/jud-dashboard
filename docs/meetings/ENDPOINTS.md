# نظام الاجتماعات - APIs Specification

## نظرة عامة

جميع الـ APIs تعمل عبر Next.js API Routes مع تكامل Google Calendar عبر Service Account.

---

## 1. Public APIs (بدون مصادقة)

### 1.1 جلب الأوقات المتاحة

```
GET /api/meetings/availability
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employee_id | UUID | ✅ | معرف الموظف |
| start_date | ISO8601 | ✅ | تاريخ البداية |
| end_date | ISO8601 | ✅ | تاريخ النهاية (max 30 يوم) |
| duration | number | ❌ | مدة الاجتماع (30 أو 60 دقيقة) |

**Response (200):**

```typescript
interface AvailabilityResponse {
  success: true;
  employee: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
  };
  settings: {
    slot_duration: 30 | 60;
    min_notice_hours: number;
    max_advance_days: number;
  };
  available_slots: Array<{
    datetime: string; // ISO8601
    duration: number;
    formatted_date: string; // "الأحد، 24 يناير 2026"
    formatted_time: string; // "09:00 ص"
  }>;
}
```

**Error Responses:**

```typescript
// 400 - Bad Request
{ error: "employee_id مطلوب", code: "MISSING_EMPLOYEE_ID" }
{ error: "نطاق التاريخ يتجاوز 30 يوم", code: "DATE_RANGE_TOO_LARGE" }

// 404 - Not Found
{ error: "الموظف غير موجود", code: "EMPLOYEE_NOT_FOUND" }

// 503 - Service Unavailable
{ error: "الموظف لا يقبل اجتماعات حالياً", code: "NOT_ACCEPTING_MEETINGS" }
```

---

### 1.2 حجز اجتماع جديد

```
POST /api/meetings/book
```

**Request Body:**

```typescript
interface BookMeetingRequest {
  employee_id: string;           // UUID
  datetime: string;              // ISO8601
  duration_minutes: 30 | 60;
  client_name: string;           // min 2, max 100
  client_email: string;          // valid email
  client_phone?: string;         // optional, E.164 format
  subject: string;               // min 5, max 200
  notes?: string;                // optional, max 1000
  recaptcha_token: string;       // reCAPTCHA v3 token
}
```

**Response (201):**

```typescript
interface BookMeetingResponse {
  success: true;
  meeting: {
    id: string;
    datetime: string;
    duration_minutes: number;
    subject: string;
    employee: {
      name: string;
      email: string;
    };
    confirmation_url: string;    // رابط صفحة التأكيد
    cancel_url: string;          // رابط الإلغاء
    reschedule_url: string;      // رابط إعادة الجدولة
    calendar_links: {
      google: string;
      outlook: string;
      ical: string;
    };
  };
  message: "تم حجز الاجتماع بنجاح. تم إرسال تأكيد إلى بريدك الإلكتروني.";
}
```

**Error Responses:**

```typescript
// 400 - Bad Request
{ error: "البيانات غير صالحة", code: "VALIDATION_ERROR", details: [...] }
{ error: "الوقت المحدد غير متاح", code: "SLOT_NOT_AVAILABLE" }
{ error: "فشل التحقق من reCAPTCHA", code: "RECAPTCHA_FAILED" }

// 404 - Not Found
{ error: "الموظف غير موجود", code: "EMPLOYEE_NOT_FOUND" }

// 429 - Too Many Requests
{ error: "تجاوزت الحد المسموح. حاول بعد ساعة.", code: "RATE_LIMIT_EXCEEDED" }

// 503 - Service Unavailable
{ error: "فشل الاتصال بـ Google Calendar", code: "GOOGLE_API_ERROR" }
```

---

### 1.3 عرض تفاصيل الاجتماع (للعميل)

```
GET /api/meetings/[id]/details
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | ✅ | JWT token للتحقق |

**Response (200):**

```typescript
interface MeetingDetailsResponse {
  success: true;
  meeting: {
    id: string;
    datetime: string;
    duration_minutes: number;
    subject: string;
    notes?: string;
    status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    employee: {
      name: string;
      avatar?: string;
      title?: string;
    };
    can_reschedule: boolean;     // false if < 24h or already rescheduled 2x
    can_cancel: boolean;         // false if already cancelled
    reschedule_count: number;
  };
}
```

**Error Responses:**

```typescript
// 401 - Unauthorized
{ error: "رابط غير صالح أو منتهي الصلاحية", code: "INVALID_TOKEN" }

// 404 - Not Found
{ error: "الاجتماع غير موجود", code: "MEETING_NOT_FOUND" }
```

---

### 1.4 إعادة جدولة الاجتماع

```
PUT /api/meetings/[id]/reschedule
```

**Request Body:**

```typescript
interface RescheduleMeetingRequest {
  token: string;                 // JWT token
  new_datetime: string;          // ISO8601
  reason?: string;               // optional, max 500
}
```

**Response (200):**

```typescript
interface RescheduleMeetingResponse {
  success: true;
  meeting: {
    id: string;
    old_datetime: string;
    new_datetime: string;
    reschedule_count: number;
  };
  message: "تم إعادة جدولة الاجتماع بنجاح.";
}
```

**Error Responses:**

```typescript
// 400 - Bad Request
{ error: "الوقت الجديد غير متاح", code: "SLOT_NOT_AVAILABLE" }
{ error: "لا يمكن إعادة الجدولة قبل أقل من 24 ساعة", code: "TOO_LATE_TO_RESCHEDULE" }
{ error: "تجاوزت الحد الأقصى لإعادة الجدولة (2 مرات)", code: "MAX_RESCHEDULES_REACHED" }

// 401 - Unauthorized
{ error: "رابط غير صالح أو منتهي الصلاحية", code: "INVALID_TOKEN" }

// 404 - Not Found
{ error: "الاجتماع غير موجود", code: "MEETING_NOT_FOUND" }

// 409 - Conflict
{ error: "الاجتماع ملغي بالفعل", code: "MEETING_ALREADY_CANCELLED" }
```

---

### 1.5 إلغاء الاجتماع

```
DELETE /api/meetings/[id]/cancel
```

**Request Body:**

```typescript
interface CancelMeetingRequest {
  token: string;                 // JWT token
  reason?: string;               // optional, max 500
}
```

**Response (200):**

```typescript
interface CancelMeetingResponse {
  success: true;
  message: "تم إلغاء الاجتماع بنجاح.";
}
```

**Error Responses:**

```typescript
// 401 - Unauthorized
{ error: "رابط غير صالح أو منتهي الصلاحية", code: "INVALID_TOKEN" }

// 404 - Not Found
{ error: "الاجتماع غير موجود", code: "MEETING_NOT_FOUND" }

// 409 - Conflict
{ error: "الاجتماع ملغي بالفعل", code: "MEETING_ALREADY_CANCELLED" }
```

---

## 2. Protected APIs (تتطلب مصادقة الموظف)

### 2.1 جلب اجتماعاتي

```
GET /api/admin/meetings
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | ❌ | confirmed, cancelled, completed, no_show |
| start_date | ISO8601 | ❌ | تاريخ البداية |
| end_date | ISO8601 | ❌ | تاريخ النهاية |
| page | number | ❌ | رقم الصفحة (default: 1) |
| limit | number | ❌ | عدد النتائج (default: 20, max: 100) |

**Response (200):**

```typescript
interface MyMeetingsResponse {
  success: true;
  meetings: Array<{
    id: string;
    datetime: string;
    duration_minutes: number;
    subject: string;
    notes?: string;
    status: string;
    client: {
      name: string;
      email: string;
      phone?: string;
    };
    reschedule_count: number;
    created_at: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  stats: {
    today: number;
    this_week: number;
    pending: number;
    completed: number;
  };
}
```

---

### 2.2 تفاصيل اجتماع محدد

```
GET /api/admin/meetings/[id]
```

**Response (200):**

```typescript
interface MeetingDetailResponse {
  success: true;
  meeting: {
    id: string;
    datetime: string;
    duration_minutes: number;
    subject: string;
    notes?: string;
    status: string;
    client: {
      name: string;
      email: string;
      phone?: string;
    };
    google_event_id?: string;
    google_meet_link?: string;
    reschedule_count: number;
    cancelled_at?: string;
    cancellation_reason?: string;
    cancelled_by?: string;
    created_at: string;
    updated_at: string;
    history: Array<{
      action: string;
      old_datetime?: string;
      new_datetime?: string;
      reason?: string;
      performed_by: string;
      created_at: string;
    }>;
  };
}
```

---

### 2.3 إلغاء اجتماع (بواسطة الموظف)

```
DELETE /api/admin/meetings/[id]
```

**Request Body:**

```typescript
interface AdminCancelMeetingRequest {
  reason: string;                // required, min 10, max 500
  notify_client: boolean;        // default: true
}
```

**Response (200):**

```typescript
interface AdminCancelMeetingResponse {
  success: true;
  message: "تم إلغاء الاجتماع وإشعار العميل.";
}
```

---

### 2.4 تحديث حالة الاجتماع

```
PUT /api/admin/meetings/[id]/status
```

**Request Body:**

```typescript
interface UpdateMeetingStatusRequest {
  status: 'completed' | 'no_show';
  notes?: string;
}
```

**Response (200):**

```typescript
interface UpdateMeetingStatusResponse {
  success: true;
  meeting: {
    id: string;
    status: string;
  };
  message: "تم تحديث حالة الاجتماع.";
}
```

---

### 2.5 إعدادات الاجتماعات

```
GET /api/admin/meetings/settings
```

**Response (200):**

```typescript
interface MeetingSettingsResponse {
  success: true;
  settings: {
    working_hours: {
      sun: { start: string; end: string; enabled: boolean };
      mon: { start: string; end: string; enabled: boolean };
      tue: { start: string; end: string; enabled: boolean };
      wed: { start: string; end: string; enabled: boolean };
      thu: { start: string; end: string; enabled: boolean };
      fri: { start: string; end: string; enabled: boolean };
      sat: { start: string; end: string; enabled: boolean };
    };
    slot_duration: 30 | 60;
    buffer_before: number;
    buffer_after: number;
    max_advance_days: number;
    min_notice_hours: number;
    max_meetings_per_day: number;
    is_accepting_meetings: boolean;
    google_calendar_connected: boolean;
    booking_page_url: string;
  };
}
```

---

### 2.6 تحديث إعدادات الاجتماعات

```
PUT /api/admin/meetings/settings
```

**Request Body:**

```typescript
interface UpdateMeetingSettingsRequest {
  working_hours?: {
    [day: string]: { start: string; end: string; enabled: boolean };
  };
  slot_duration?: 30 | 60;
  buffer_before?: number;        // 0-60 minutes
  buffer_after?: number;         // 0-60 minutes
  max_advance_days?: number;     // 1-90 days
  min_notice_hours?: number;     // 1-168 hours
  max_meetings_per_day?: number; // 1-20
  is_accepting_meetings?: boolean;
}
```

**Response (200):**

```typescript
interface UpdateMeetingSettingsResponse {
  success: true;
  settings: MeetingSettingsResponse['settings'];
  message: "تم تحديث الإعدادات بنجاح.";
}
```

---

### 2.7 ربط Google Calendar

```
POST /api/admin/meetings/connect-google
```

**Request Body:**

```typescript
interface ConnectGoogleRequest {
  calendar_id: string;           // Google Calendar ID
}
```

**Response (200):**

```typescript
interface ConnectGoogleResponse {
  success: true;
  message: "تم ربط Google Calendar بنجاح.";
  calendar: {
    id: string;
    name: string;
  };
}
```

---

## 3. Webhook APIs

### 3.1 Google Calendar Webhook (Push Notifications)

```
POST /api/webhooks/google-calendar
```

**Headers:**

```
X-Goog-Channel-ID: channel-id
X-Goog-Resource-ID: resource-id
X-Goog-Resource-State: sync | exists | not_exists
```

**Response (200):**

```typescript
{ received: true }
```

---

## 4. Validation Schemas (Zod)

```typescript
import { z } from 'zod';

// Book Meeting Schema
export const bookMeetingSchema = z.object({
  employee_id: z.string().uuid(),
  datetime: z.string().datetime(),
  duration_minutes: z.union([z.literal(30), z.literal(60)]),
  client_name: z.string().min(2).max(100),
  client_email: z.string().email(),
  client_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  subject: z.string().min(5).max(200),
  notes: z.string().max(1000).optional(),
  recaptcha_token: z.string().min(1),
});

// Reschedule Meeting Schema
export const rescheduleMeetingSchema = z.object({
  token: z.string().min(1),
  new_datetime: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

// Cancel Meeting Schema
export const cancelMeetingSchema = z.object({
  token: z.string().min(1),
  reason: z.string().max(500).optional(),
});

// Meeting Settings Schema
export const meetingSettingsSchema = z.object({
  working_hours: z.record(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    enabled: z.boolean(),
  })).optional(),
  slot_duration: z.union([z.literal(30), z.literal(60)]).optional(),
  buffer_before: z.number().min(0).max(60).optional(),
  buffer_after: z.number().min(0).max(60).optional(),
  max_advance_days: z.number().min(1).max(90).optional(),
  min_notice_hours: z.number().min(1).max(168).optional(),
  max_meetings_per_day: z.number().min(1).max(20).optional(),
  is_accepting_meetings: z.boolean().optional(),
});
```

---

## 5. Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | البيانات المدخلة غير صالحة |
| MISSING_EMPLOYEE_ID | 400 | معرف الموظف مطلوب |
| DATE_RANGE_TOO_LARGE | 400 | نطاق التاريخ كبير جداً |
| SLOT_NOT_AVAILABLE | 400 | الوقت المحدد غير متاح |
| RECAPTCHA_FAILED | 400 | فشل التحقق من reCAPTCHA |
| TOO_LATE_TO_RESCHEDULE | 400 | فات موعد إعادة الجدولة |
| MAX_RESCHEDULES_REACHED | 400 | تجاوزت الحد الأقصى |
| INVALID_TOKEN | 401 | رابط غير صالح |
| UNAUTHORIZED | 401 | غير مصرح |
| EMPLOYEE_NOT_FOUND | 404 | الموظف غير موجود |
| MEETING_NOT_FOUND | 404 | الاجتماع غير موجود |
| MEETING_ALREADY_CANCELLED | 409 | الاجتماع ملغي |
| RATE_LIMIT_EXCEEDED | 429 | تجاوزت الحد المسموح |
| NOT_ACCEPTING_MEETINGS | 503 | لا يقبل اجتماعات |
| GOOGLE_API_ERROR | 503 | خطأ في Google API |

---

## 6. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET /api/meetings/availability | 60 req | per minute |
| POST /api/meetings/book | 5 req | per hour per IP |
| PUT /api/meetings/[id]/reschedule | 3 req | per hour per meeting |
| DELETE /api/meetings/[id]/cancel | 1 req | per meeting |
| Admin endpoints | 100 req | per minute |

---

## 7. Security Considerations

### 7.1 Token Structure

```typescript
// Meeting Token (JWT)
interface MeetingToken {
  meeting_id: string;
  client_email: string;
  action: 'view' | 'reschedule' | 'cancel';
  exp: number; // 30 days from creation
  iat: number;
}
```

### 7.2 Required Headers

```
Content-Type: application/json
X-Requested-With: XMLHttpRequest  // CSRF protection
```

### 7.3 CORS Policy

```typescript
// Public endpoints: Allow specific origins
// Admin endpoints: Same-origin only
```
