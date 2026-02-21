// types/permissions.ts
// أنواع نظام الصلاحيات والأدوار

export interface Permission {
  id: string
  key: string
  label: string
  description: string
  category: string
  subcategory?: string
  created_at?: string
}

export interface RolePermission {
  id?: string
  role_id: string
  permission_id: string
  granted: boolean
  updated_at?: string
}

export interface Role {
  id: string
  name: string           // اسم إنجليزي فريد (للاستخدام البرمجي)
  name_ar: string        // اسم عربي للعرض
  description: string
  color: string
  icon: string
  is_system: boolean     // الأدوار النظامية لا يمكن حذفها
  created_at: string
  updated_at?: string
  permissions: RolePermission[]
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by?: string
  assigned_at: string
}

// === ثوابت أقسام الصلاحيات ===
export const PERMISSION_CATEGORIES = {
  DASHBOARD: "لوحة التحكم",
  STORES: "إدارة المتاجر",
  TASKS: "إدارة المهام",
  USERS: "إدارة المستخدمين",
  CLIENTS: "إدارة العملاء",
  ATTENDANCE: "الحضور والانصراف",
  SHOP: "المتجر",
  REPORTS: "التقارير والتحليلات",
  SETTINGS: "الإعدادات",
  NOTIFICATIONS: "الإشعارات والرسائل",
} as const

// === دالة فحص الصلاحية ===
export function hasPermission(
  userPermissions: RolePermission[],
  permissionKey: string,
  allPermissions: Permission[]
): boolean {
  const perm = allPermissions.find(p => p.key === permissionKey)
  if (!perm) return false
  const rp = userPermissions.find(up => up.permission_id === perm.id)
  return rp?.granted ?? false
}

// === دالة فحص أي صلاحية من مجموعة ===
export function hasAnyPermission(
  userPermissions: RolePermission[],
  permissionKeys: string[],
  allPermissions: Permission[]
): boolean {
  return permissionKeys.some(key => hasPermission(userPermissions, key, allPermissions))
}

// === دالة فحص جميع الصلاحيات ===
export function hasAllPermissions(
  userPermissions: RolePermission[],
  permissionKeys: string[],
  allPermissions: Permission[]
): boolean {
  return permissionKeys.every(key => hasPermission(userPermissions, key, allPermissions))
}
