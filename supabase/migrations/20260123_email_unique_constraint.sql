-- =====================================================
-- Migration: إضافة UNIQUE constraint على email في admin_users
-- التاريخ: 2026-01-23
-- =====================================================

-- =====================================================
-- الخطوة 1: تقرير الـ Emails المكررة (شغّل هذا أولاً للفحص)
-- =====================================================
-- استعلام للكشف عن emails مكررة قبل تطبيق الـ UNIQUE
-- شغّل هذا الاستعلام أولاً وتأكد أن النتيجة فارغة

/*
SELECT 
    lower(email) as email_lower,
    COUNT(*) as count,
    array_agg(id) as user_ids,
    array_agg(username) as usernames,
    array_agg(name) as names
FROM public.admin_users 
WHERE email IS NOT NULL AND email != ''
GROUP BY lower(email) 
HAVING COUNT(*) > 1;
*/

-- =====================================================
-- الخطوة 2: تقرير المستخدمين بدون email
-- =====================================================
/*
SELECT id, username, name, email
FROM public.admin_users
WHERE email IS NULL OR email = '';
*/

-- =====================================================
-- الخطوة 3: إضافة UNIQUE index على email (case-insensitive)
-- =====================================================
-- هذا الـ index يضمن عدم تكرار الـ email بغض النظر عن حالة الأحرف
-- مثال: 'User@Email.com' و 'user@email.com' يعتبران نفس الـ email

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique 
ON public.admin_users (lower(email)) 
WHERE email IS NOT NULL AND email != '';

-- =====================================================
-- ملاحظات:
-- - الـ index يتجاهل الصفوف التي email = NULL أو فارغ
-- - إذا وجدت emails مكررة، يجب تصحيحها يدوياً قبل تشغيل هذا الـ migration
-- - للتصحيح: UPDATE admin_users SET email = 'new_email@example.com' WHERE id = 'xxx';
-- =====================================================
