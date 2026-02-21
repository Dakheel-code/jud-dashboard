-- =====================================================
-- نظام الصلاحيات والأدوار - Admin Permissions System
-- يُنفذ في Supabase SQL Editor
-- الجداول تستخدم prefix: admin_ للتوافق مع lib/rbac.ts
-- =====================================================

-- =====================================================
-- إضافة الأعمدة الناقصة للجداول الموجودة مسبقاً
-- =====================================================
ALTER TABLE admin_permissions ADD COLUMN IF NOT EXISTS label       TEXT;
ALTER TABLE admin_permissions ADD COLUMN IF NOT EXISTS category    TEXT NOT NULL DEFAULT '';
ALTER TABLE admin_permissions ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- نسخ name → label إذا كان label فارغاً
UPDATE admin_permissions SET label = name WHERE label IS NULL OR label = '';

ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS color   TEXT DEFAULT '#6b7280';
ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS icon    TEXT DEFAULT '👤';
ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- نسخ name → name_ar إذا كان فارغاً
UPDATE admin_roles SET name_ar = name WHERE name_ar IS NULL OR name_ar = '';

-- إضافة عمود granted لـ admin_role_permissions إذا لم يكن موجوداً
ALTER TABLE admin_role_permissions ADD COLUMN IF NOT EXISTS granted    BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- إنشاء الجداول الجديدة إن لم تكن موجودة
-- =====================================================

-- 1) جدول الأدوار
CREATE TABLE IF NOT EXISTS admin_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,       -- اسم برمجي فريد: super_admin, admin, manager...
  name        TEXT NOT NULL,              -- اسم عربي للعرض: مدير النظام، مشرف...
  description TEXT DEFAULT '',
  color       TEXT DEFAULT '#6b7280',
  icon        TEXT DEFAULT '👤',
  is_system   BOOLEAN DEFAULT FALSE,      -- أدوار النظام لا تُحذف
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2) جدول الصلاحيات
CREATE TABLE IF NOT EXISTS admin_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,       -- مفتاح فريد: stores.edit, tasks.delete...
  label       TEXT NOT NULL,              -- تسمية عربية
  description TEXT DEFAULT '',
  category    TEXT NOT NULL,              -- القسم: إدارة المتاجر، المتجر...
  subcategory TEXT,                       -- قسم فرعي اختياري
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3) جدول ربط الصلاحيات بالأدوار
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  granted       BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 4) جدول ربط المستخدمين بالأدوار
CREATE TABLE IF NOT EXISTS admin_user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,              -- يرتبط بـ admin_users.id
  role_id     UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- 5) جدول overrides مباشرة للمستخدم (grant / deny)
CREATE TABLE IF NOT EXISTS admin_user_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL CHECK (mode IN ('grant', 'deny')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- 6) فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_role ON admin_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_perm ON admin_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user       ON admin_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role       ON admin_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_permissions_user ON admin_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_category  ON admin_permissions(category);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_key       ON admin_permissions(key);

-- =====================================================
-- إدخال الصلاحيات الافتراضية
-- =====================================================
INSERT INTO admin_permissions (key, label, description, category, subcategory) VALUES
-- لوحة التحكم
('dashboard.view',   'عرض لوحة التحكم',    'الوصول للوحة التحكم الرئيسية',          'لوحة التحكم', NULL),
('dashboard.stats',  'عرض الإحصائيات',     'عرض الإحصائيات والتقارير المختصرة',     'لوحة التحكم', NULL),
('dashboard.export', 'تصدير التقارير',      'تصدير بيانات لوحة التحكم',              'لوحة التحكم', NULL),
-- إدارة المتاجر
('stores.view',     'عرض المتاجر',         'عرض قائمة المتاجر',                     'إدارة المتاجر', NULL),
('stores.create',   'إضافة متجر',          'إضافة متجر جديد',                       'إدارة المتاجر', NULL),
('stores.edit',     'تعديل متجر',          'تعديل بيانات المتجر',                   'إدارة المتاجر', NULL),
('stores.delete',   'حذف متجر',            'حذف متجر من النظام',                    'إدارة المتاجر', NULL),
('stores.details',  'تفاصيل المتجر',       'عرض التفاصيل الكاملة للمتجر',          'إدارة المتاجر', NULL),
('stores.settings', 'إعدادات المتجر',      'تعديل إعدادات المتجر',                  'إدارة المتاجر', NULL),
-- إدارة المهام
('tasks.view',       'عرض المهام',          'عرض قائمة المهام',                      'إدارة المهام', NULL),
('tasks.create',     'إضافة مهمة',          'إنشاء مهمة جديدة',                      'إدارة المهام', NULL),
('tasks.edit',       'تعديل مهمة',          'تعديل بيانات المهمة',                   'إدارة المهام', NULL),
('tasks.delete',     'حذف مهمة',            'حذف مهمة من النظام',                    'إدارة المهام', NULL),
('tasks.toggle',     'تغيير حالة المهمة',   'تحديد المهمة كمنجزة أو غير منجزة',     'إدارة المهام', NULL),
('tasks.assign',     'تعيين المهام',         'تعيين المهام للمستخدمين',               'إدارة المهام', NULL),
('tasks.categories', 'إدارة فئات المهام',   'إضافة وتعديل وحذف فئات المهام',        'إدارة المهام', NULL),
-- إدارة المستخدمين
('users.view',        'عرض المستخدمين',      'عرض قائمة المستخدمين',                  'إدارة المستخدمين', NULL),
('users.create',      'إضافة مستخدم',        'إضافة مستخدم جديد',                     'إدارة المستخدمين', NULL),
('users.edit',        'تعديل مستخدم',        'تعديل بيانات المستخدم',                 'إدارة المستخدمين', NULL),
('users.delete',      'حذف مستخدم',          'حذف مستخدم من النظام',                  'إدارة المستخدمين', NULL),
('users.roles',       'تغيير دور المستخدم',  'تعيين أو تغيير دور المستخدم',          'إدارة المستخدمين', NULL),
('users.activate',    'تفعيل/تعطيل المستخدم','تفعيل أو تعطيل حساب المستخدم',        'إدارة المستخدمين', NULL),
('users.permissions', 'إدارة الصلاحيات',     'إدارة الأدوار والصلاحيات',             'إدارة المستخدمين', NULL),
-- إدارة العملاء
('clients.view',    'عرض العملاء',          'عرض قائمة العملاء',                     'إدارة العملاء', NULL),
('clients.create',  'إضافة عميل',           'إضافة عميل جديد',                       'إدارة العملاء', NULL),
('clients.edit',    'تعديل بيانات العميل',  'تعديل معلومات العميل',                  'إدارة العملاء', NULL),
('clients.delete',  'حذف عميل',             'حذف عميل من النظام',                    'إدارة العملاء', NULL),
('clients.details', 'تفاصيل العميل',        'عرض التفاصيل الكاملة للعميل',          'إدارة العملاء', NULL),
('clients.export',  'تصدير بيانات العملاء', 'تصدير قائمة العملاء',                   'إدارة العملاء', NULL),
('clients.notes',   'ملاحظات العميل',       'إضافة وتعديل ملاحظات العميل',          'إدارة العملاء', NULL),
-- الحضور والانصراف
('attendance.view',     'عرض الحضور',              'عرض سجل الحضور والانصراف',              'الحضور والانصراف', NULL),
('attendance.checkin',  'تسجيل حضور',              'تسجيل الحضور يدوياً',                   'الحضور والانصراف', NULL),
('attendance.checkout', 'تسجيل انصراف',            'تسجيل الانصراف يدوياً',                 'الحضور والانصراف', NULL),
('attendance.manage',   'إدارة الحضور',            'تعديل وإدارة سجلات الحضور',             'الحضور والانصراف', NULL),
('attendance.reports',  'تقارير الحضور',           'عرض وتصدير تقارير الحضور',              'الحضور والانصراف', NULL),
('attendance.overtime', 'إدارة الأوقات الإضافية',  'إدارة وموافقة على الأوقات الإضافية',   'الحضور والانصراف', NULL),
('attendance.leaves',   'إدارة الإجازات',          'إدارة طلبات الإجازات والموافقة عليها', 'الحضور والانصراف', NULL),
-- المتجر
('shop.view',              'عرض المتجر',       'عرض صفحة المتجر والمنتجات',             'المتجر', NULL),
('shop.products.create',   'إضافة منتج',       'إضافة منتج جديد',                       'المتجر', 'المنتجات'),
('shop.products.edit',     'تعديل منتج',       'تعديل بيانات المنتج',                   'المتجر', 'المنتجات'),
('shop.products.delete',   'حذف منتج',         'حذف منتج من المتجر',                    'المتجر', 'المنتجات'),
('shop.products.pricing',  'تعديل الأسعار',    'تعديل أسعار المنتجات',                  'المتجر', 'المنتجات'),
('shop.products.inventory','إدارة المخزون',    'إدارة مخزون المنتجات',                  'المتجر', 'المنتجات'),
('shop.orders.view',       'عرض الطلبات',      'عرض قائمة الطلبات',                     'المتجر', 'الطلبات'),
('shop.orders.manage',     'إدارة الطلبات',    'تحديث حالة الطلبات وإدارتها',           'المتجر', 'الطلبات'),
('shop.orders.refund',     'إرجاع واسترداد',   'معالجة طلبات الإرجاع والاسترداد',      'المتجر', 'الطلبات'),
('shop.categories',        'إدارة الأقسام',    'إدارة أقسام وتصنيفات المتجر',           'المتجر', NULL),
('shop.coupons',           'إدارة الكوبونات',  'إنشاء وإدارة كوبونات الخصم',            'المتجر', NULL),
-- التقارير والتحليلات
('reports.view',        'عرض التقارير',        'عرض التقارير العامة',                    'التقارير والتحليلات', NULL),
('reports.sales',       'تقارير المبيعات',     'عرض تقارير المبيعات التفصيلية',         'التقارير والتحليلات', NULL),
('reports.financial',   'التقارير المالية',    'عرض التقارير المالية والأرباح',          'التقارير والتحليلات', NULL),
('reports.performance', 'تقارير الأداء',       'عرض تقارير أداء الموظفين',              'التقارير والتحليلات', NULL),
('reports.export',      'تصدير التقارير',      'تصدير التقارير بصيغ مختلفة',            'التقارير والتحليلات', NULL),
-- الإعدادات
('settings.general',       'الإعدادات العامة',      'تعديل الإعدادات العامة للنظام',          'الإعدادات', NULL),
('settings.notifications', 'إعدادات الإشعارات',    'إدارة إعدادات الإشعارات',               'الإعدادات', NULL),
('settings.integrations',  'التكاملات الخارجية',   'إدارة التكاملات مع الخدمات الخارجية',   'الإعدادات', NULL),
('settings.backup',        'النسخ الاحتياطي',      'إدارة النسخ الاحتياطي واستعادة البيانات','الإعدادات', NULL),
('settings.logs',          'سجل النظام',           'عرض سجل العمليات والأحداث',             'الإعدادات', NULL),
-- الإشعارات والرسائل
('notifications.view',   'عرض الإشعارات',   'عرض الإشعارات الواردة',                  'الإشعارات والرسائل', NULL),
('notifications.send',   'إرسال إشعارات',   'إرسال إشعارات للمستخدمين',              'الإشعارات والرسائل', NULL),
('notifications.manage', 'إدارة الإشعارات', 'إدارة وأرشفة الإشعارات',                'الإشعارات والرسائل', NULL),
('messages.view',        'عرض الرسائل',     'عرض الرسائل الواردة والصادرة',          'الإشعارات والرسائل', NULL),
('messages.send',        'إرسال رسائل',     'إرسال رسائل للمستخدمين والعملاء',       'الإشعارات والرسائل', NULL)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- إدخال الأدوار الافتراضية
-- =====================================================
INSERT INTO admin_roles (key, name, description, color, icon, is_system) VALUES
('super_admin', 'مدير النظام', 'صلاحيات كاملة على جميع أقسام النظام', '#dc2626', '👑',  TRUE),
('admin',       'مشرف',        'صلاحيات إدارية واسعة مع بعض القيود',  '#7c3aed', '🛡️', TRUE),
('manager',     'مدير فرع',    'إدارة المتجر والموظفين والعمليات',     '#2563eb', '📋', TRUE),
('employee',    'موظف',        'صلاحيات أساسية للعمل اليومي',          '#059669', '👤', TRUE),
('viewer',      'مشاهد',       'عرض فقط بدون أي صلاحيات تعديل',       '#6b7280', '👁️', FALSE)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- ربط الصلاحيات بالأدوار
-- =====================================================

-- مدير النظام: جميع الصلاحيات
INSERT INTO admin_role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, TRUE
FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.key = 'super_admin'
ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = TRUE;

-- المشرف: جميع الصلاحيات ماعدا الحساسة
INSERT INTO admin_role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id,
  CASE WHEN p.key IN ('settings.backup','settings.logs','users.permissions','users.delete','stores.delete')
    THEN FALSE ELSE TRUE END
FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.key = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- مدير الفرع: بدون إعدادات وحذف وصلاحيات
INSERT INTO admin_role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id,
  CASE WHEN p.category = 'الإعدادات' OR p.key LIKE '%delete%' OR p.key LIKE '%permissions%'
    THEN FALSE ELSE TRUE END
FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.key = 'manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- الموظف: صلاحيات محدودة
INSERT INTO admin_role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id,
  CASE WHEN p.key IN (
    'dashboard.view','tasks.view','tasks.toggle',
    'attendance.view','attendance.checkin','attendance.checkout',
    'shop.view','shop.orders.view',
    'notifications.view','messages.view',
    'clients.view','clients.details'
  ) THEN TRUE ELSE FALSE END
FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.key = 'employee'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- المشاهد: عرض فقط
INSERT INTO admin_role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id,
  CASE WHEN p.key LIKE '%.view' OR p.key = 'dashboard.stats'
    THEN TRUE ELSE FALSE END
FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.key = 'viewer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- دالة مساعدة: فحص صلاحية مستخدم
-- =====================================================
CREATE OR REPLACE FUNCTION check_admin_permission(
  p_user_id UUID,
  p_permission_key TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- فحص deny أولاً (ينتصر دائماً)
  IF EXISTS (
    SELECT 1 FROM admin_user_permissions up
    JOIN admin_permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id AND p.key = p_permission_key AND up.mode = 'deny'
  ) THEN RETURN FALSE; END IF;

  -- فحص grant مباشر
  IF EXISTS (
    SELECT 1 FROM admin_user_permissions up
    JOIN admin_permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id AND p.key = p_permission_key AND up.mode = 'grant'
  ) THEN RETURN TRUE; END IF;

  -- فحص عبر الأدوار
  RETURN EXISTS (
    SELECT 1
    FROM admin_user_roles ur
    JOIN admin_role_permissions rp ON rp.role_id = ur.role_id
    JOIN admin_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
      AND p.key = p_permission_key
      AND rp.granted = TRUE
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE admin_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_permissions  ENABLE ROW LEVEL SECURITY;

-- قراءة للجميع
CREATE POLICY "admin_roles_read"            ON admin_roles            FOR SELECT USING (TRUE);
CREATE POLICY "admin_permissions_read"      ON admin_permissions      FOR SELECT USING (TRUE);
CREATE POLICY "admin_role_permissions_read" ON admin_role_permissions FOR SELECT USING (TRUE);
CREATE POLICY "admin_user_roles_read"       ON admin_user_roles       FOR SELECT USING (TRUE);
CREATE POLICY "admin_user_permissions_read" ON admin_user_permissions FOR SELECT USING (TRUE);

-- كتابة للجميع (service role يتحكم بالأمان)
CREATE POLICY "admin_roles_write"            ON admin_roles            FOR ALL USING (TRUE);
CREATE POLICY "admin_role_permissions_write" ON admin_role_permissions FOR ALL USING (TRUE);
CREATE POLICY "admin_user_roles_write"       ON admin_user_roles       FOR ALL USING (TRUE);
CREATE POLICY "admin_user_permissions_write" ON admin_user_permissions FOR ALL USING (TRUE);
