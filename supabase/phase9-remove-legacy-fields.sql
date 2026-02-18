-- =====================================================
-- PHASE 9: إزالة الحقول القديمة من admin_users
-- ⚠️ لا تنفذ هذا إلا بعد التأكد أن RBAC يعمل لمدة أسبوع على الأقل
-- ⚠️ تأكد أن كل الكود يستخدم جداول RBAC وليس الحقول القديمة
-- =====================================================

-- الخطوة 1: تأكد أن كل المستخدمين عندهم أدوار في RBAC
-- إذا الرقم > 0 = فيه مستخدمين بدون أدوار RBAC — لا تكمل!
SELECT COUNT(*) as users_without_rbac_roles
FROM admin_users u
WHERE NOT EXISTS (
  SELECT 1 FROM admin_user_roles ur WHERE ur.user_id = u.id
);

-- الخطوة 2: (اختياري) حذف الحقول القديمة
-- ⚠️ لا رجعة بعد هذا — تأكد 100%
-- ALTER TABLE admin_users DROP COLUMN IF EXISTS role;
-- ALTER TABLE admin_users DROP COLUMN IF EXISTS roles;
-- ALTER TABLE admin_users DROP COLUMN IF EXISTS permissions;
