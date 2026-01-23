# تشغيل Migration نظام الاجتماعات

## الخطوات:

### 1. افتح Supabase Dashboard
اذهب إلى: https://supabase.com/dashboard

### 2. اختر المشروع
اختر مشروعك من القائمة

### 3. افتح SQL Editor
من القائمة الجانبية، اختر **SQL Editor**

### 4. انسخ محتوى الملف
انسخ محتوى الملف التالي:
```
supabase/migrations/20260123060800_meetings_complete.sql
```

### 5. الصق وشغّل
الصق المحتوى في SQL Editor واضغط **Run**

---

## الجداول التي سيتم إنشاؤها:

| الجدول | الوصف |
|--------|-------|
| `meeting_types` | أنواع الاجتماعات |
| `employee_meeting_settings` | إعدادات الموظف للاجتماعات |
| `employee_availability` | أوقات العمل |
| `employee_time_off` | الإجازات والأوقات المحجوبة |
| `google_oauth_accounts` | حسابات Google OAuth |
| `meetings` | الاجتماعات الرئيسية |
| `meeting_logs` | سجل التغييرات |
| `meeting_rate_limits` | Rate Limiting |

---

## الفهارس (Indexes):

- `idx_meetings_employee_start` - للبحث بالموظف والتاريخ
- `idx_meetings_status` - للبحث بالحالة
- `idx_employee_availability_lookup` - للبحث بأوقات العمل

---

## RLS Policies:

- ✅ RLS مفعل على جميع الجداول
- ✅ السياسات تسمح بالوصول عبر API فقط
- ✅ الصفحة العامة لا تصل مباشرة لقاعدة البيانات
