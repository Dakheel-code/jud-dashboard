"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBranding } from '@/contexts/BrandingContext'

// ==================== TYPES ====================
interface Permission {
  id: string
  key: string
  label: string
  description: string
  category: string
  subcategory?: string
}

interface RolePermission {
  permission_id: string
  granted: boolean
}

interface Role {
  id: string
  name: string
  name_ar: string
  description: string
  color: string
  icon: string
  is_system: boolean // أدوار النظام لا يمكن حذفها
  created_at: string
  permissions: RolePermission[]
}

// ==================== بيانات الصلاحيات الافتراضية ====================
const DEFAULT_PERMISSIONS: Permission[] = [
  // === لوحة التحكم ===
  { id: "p1", key: "dashboard.view", label: "عرض لوحة التحكم", description: "الوصول للوحة التحكم الرئيسية", category: "لوحة التحكم" },
  { id: "p2", key: "dashboard.stats", label: "عرض الإحصائيات", description: "عرض الإحصائيات والتقارير المختصرة", category: "لوحة التحكم" },
  { id: "p3", key: "dashboard.export", label: "تصدير التقارير", description: "تصدير بيانات لوحة التحكم", category: "لوحة التحكم" },

  // === إدارة المتاجر ===
  { id: "p4", key: "stores.view", label: "عرض المتاجر", description: "عرض قائمة المتاجر", category: "إدارة المتاجر" },
  { id: "p5", key: "stores.create", label: "إضافة متجر", description: "إضافة متجر جديد", category: "إدارة المتاجر" },
  { id: "p6", key: "stores.edit", label: "تعديل متجر", description: "تعديل بيانات المتجر", category: "إدارة المتاجر" },
  { id: "p7", key: "stores.delete", label: "حذف متجر", description: "حذف متجر من النظام", category: "إدارة المتاجر" },
  { id: "p8", key: "stores.details", label: "تفاصيل المتجر", description: "عرض التفاصيل الكاملة للمتجر", category: "إدارة المتاجر" },
  { id: "p9", key: "stores.settings", label: "إعدادات المتجر", description: "تعديل إعدادات المتجر", category: "إدارة المتاجر" },

  // === إدارة المهام ===
  { id: "p10", key: "tasks.view", label: "عرض المهام", description: "عرض قائمة المهام", category: "إدارة المهام" },
  { id: "p11", key: "tasks.create", label: "إضافة مهمة", description: "إنشاء مهمة جديدة", category: "إدارة المهام" },
  { id: "p12", key: "tasks.edit", label: "تعديل مهمة", description: "تعديل بيانات المهمة", category: "إدارة المهام" },
  { id: "p13", key: "tasks.delete", label: "حذف مهمة", description: "حذف مهمة من النظام", category: "إدارة المهام" },
  { id: "p14", key: "tasks.toggle", label: "تغيير حالة المهمة", description: "تحديد المهمة كمنجزة أو غير منجزة", category: "إدارة المهام" },
  { id: "p15", key: "tasks.assign", label: "تعيين المهام", description: "تعيين المهام للمستخدمين", category: "إدارة المهام" },
  { id: "p16", key: "tasks.categories", label: "إدارة فئات المهام", description: "إضافة وتعديل وحذف فئات المهام", category: "إدارة المهام" },

  // === إدارة المستخدمين ===
  { id: "p17", key: "users.view", label: "عرض المستخدمين", description: "عرض قائمة المستخدمين", category: "إدارة المستخدمين" },
  { id: "p18", key: "users.create", label: "إضافة مستخدم", description: "إضافة مستخدم جديد", category: "إدارة المستخدمين" },
  { id: "p19", key: "users.edit", label: "تعديل مستخدم", description: "تعديل بيانات المستخدم", category: "إدارة المستخدمين" },
  { id: "p20", key: "users.delete", label: "حذف مستخدم", description: "حذف مستخدم من النظام", category: "إدارة المستخدمين" },
  { id: "p21", key: "users.roles", label: "تغيير دور المستخدم", description: "تعيين أو تغيير دور المستخدم", category: "إدارة المستخدمين" },
  { id: "p22", key: "users.activate", label: "تفعيل/تعطيل المستخدم", description: "تفعيل أو تعطيل حساب المستخدم", category: "إدارة المستخدمين" },
  { id: "p23", key: "users.permissions", label: "إدارة الصلاحيات", description: "إدارة الأدوار والصلاحيات", category: "إدارة المستخدمين" },

  // === إدارة العملاء ===
  { id: "p24", key: "clients.view", label: "عرض العملاء", description: "عرض قائمة العملاء", category: "إدارة العملاء" },
  { id: "p25", key: "clients.create", label: "إضافة عميل", description: "إضافة عميل جديد", category: "إدارة العملاء" },
  { id: "p26", key: "clients.edit", label: "تعديل بيانات العميل", description: "تعديل معلومات العميل", category: "إدارة العملاء" },
  { id: "p27", key: "clients.delete", label: "حذف عميل", description: "حذف عميل من النظام", category: "إدارة العملاء" },
  { id: "p28", key: "clients.details", label: "تفاصيل العميل", description: "عرض التفاصيل الكاملة للعميل", category: "إدارة العملاء" },
  { id: "p29", key: "clients.export", label: "تصدير بيانات العملاء", description: "تصدير قائمة العملاء", category: "إدارة العملاء" },
  { id: "p30", key: "clients.notes", label: "ملاحظات العميل", description: "إضافة وتعديل ملاحظات العميل", category: "إدارة العملاء" },

  // === الحضور والانصراف ===
  { id: "p31", key: "attendance.view", label: "عرض الحضور", description: "عرض سجل الحضور والانصراف", category: "الحضور والانصراف" },
  { id: "p32", key: "attendance.checkin", label: "تسجيل حضور", description: "تسجيل الحضور يدوياً", category: "الحضور والانصراف" },
  { id: "p33", key: "attendance.checkout", label: "تسجيل انصراف", description: "تسجيل الانصراف يدوياً", category: "الحضور والانصراف" },
  { id: "p34", key: "attendance.manage", label: "إدارة الحضور", description: "تعديل وإدارة سجلات الحضور", category: "الحضور والانصراف" },
  { id: "p35", key: "attendance.reports", label: "تقارير الحضور", description: "عرض وتصدير تقارير الحضور", category: "الحضور والانصراف" },
  { id: "p36", key: "attendance.overtime", label: "إدارة الأوقات الإضافية", description: "إدارة وموافقة على الأوقات الإضافية", category: "الحضور والانصراف" },
  { id: "p37", key: "attendance.leaves", label: "إدارة الإجازات", description: "إدارة طلبات الإجازات والموافقة عليها", category: "الحضور والانصراف" },

  // === المتجر / المنتجات ===
  { id: "p38", key: "shop.view", label: "عرض المتجر", description: "عرض صفحة المتجر والمنتجات", category: "المتجر" },
  { id: "p39", key: "shop.products.create", label: "إضافة منتج", description: "إضافة منتج جديد", category: "المتجر", subcategory: "المنتجات" },
  { id: "p40", key: "shop.products.edit", label: "تعديل منتج", description: "تعديل بيانات المنتج", category: "المتجر", subcategory: "المنتجات" },
  { id: "p41", key: "shop.products.delete", label: "حذف منتج", description: "حذف منتج من المتجر", category: "المتجر", subcategory: "المنتجات" },
  { id: "p42", key: "shop.products.pricing", label: "تعديل الأسعار", description: "تعديل أسعار المنتجات", category: "المتجر", subcategory: "المنتجات" },
  { id: "p43", key: "shop.products.inventory", label: "إدارة المخزون", description: "إدارة مخزون المنتجات", category: "المتجر", subcategory: "المنتجات" },
  { id: "p44", key: "shop.orders.view", label: "عرض الطلبات", description: "عرض قائمة الطلبات", category: "المتجر", subcategory: "الطلبات" },
  { id: "p45", key: "shop.orders.manage", label: "إدارة الطلبات", description: "تحديث حالة الطلبات وإدارتها", category: "المتجر", subcategory: "الطلبات" },
  { id: "p46", key: "shop.orders.refund", label: "إرجاع واسترداد", description: "معالجة طلبات الإرجاع والاسترداد", category: "المتجر", subcategory: "الطلبات" },
  { id: "p47", key: "shop.categories", label: "إدارة الأقسام", description: "إدارة أقسام وتصنيفات المتجر", category: "المتجر" },
  { id: "p48", key: "shop.coupons", label: "إدارة الكوبونات", description: "إنشاء وإدارة كوبونات الخصم", category: "المتجر" },

  // === التقارير والتحليلات ===
  { id: "p49", key: "reports.view", label: "عرض التقارير", description: "عرض التقارير العامة", category: "التقارير والتحليلات" },
  { id: "p50", key: "reports.sales", label: "تقارير المبيعات", description: "عرض تقارير المبيعات التفصيلية", category: "التقارير والتحليلات" },
  { id: "p51", key: "reports.financial", label: "التقارير المالية", description: "عرض التقارير المالية والأرباح", category: "التقارير والتحليلات" },
  { id: "p52", key: "reports.performance", label: "تقارير الأداء", description: "عرض تقارير أداء الموظفين", category: "التقارير والتحليلات" },
  { id: "p53", key: "reports.export", label: "تصدير التقارير", description: "تصدير التقارير بصيغ مختلفة", category: "التقارير والتحليلات" },

  // === الفوترة ===
  { id: "p64", key: "billing.view",               label: "عرض الفوترة",            description: "الوصول لصفحة الفوترة وعرض البيانات",           category: "الفوترة" },
  { id: "p65", key: "billing.invoices.view",       label: "عرض الفواتير",           description: "عرض قائمة الفواتير الشهرية",                   category: "الفوترة" },
  { id: "p66", key: "billing.invoices.manage",     label: "إدارة الفواتير",         description: "تعديل حالة الفواتير والموافقة عليها",           category: "الفوترة" },
  { id: "p67", key: "billing.invoices.generate",   label: "توليد الفواتير",         description: "توليد الفواتير الشهرية تلقائياً",               category: "الفوترة" },
  { id: "p68", key: "billing.commissions.view",    label: "عرض العمولات",           description: "عرض عمولات الموظفين",                          category: "الفوترة" },
  { id: "p69", key: "billing.commissions.manage",  label: "إدارة العمولات",         description: "تعديل وإدارة عمولات الموظفين",                 category: "الفوترة" },
  { id: "p70", key: "billing.bonuses.view",        label: "عرض البونص",             description: "عرض بونص الموظفين",                            category: "الفوترة" },
  { id: "p71", key: "billing.bonuses.manage",      label: "إدارة البونص",           description: "تعديل وإدارة بونص الموظفين",                   category: "الفوترة" },
  { id: "p72", key: "billing.salaries.view",       label: "عرض الرواتب",            description: "عرض رواتب الموظفين",                           category: "الفوترة" },
  { id: "p73", key: "billing.salaries.manage",     label: "إدارة الرواتب",          description: "تعديل الرواتب والخصومات والإضافات",            category: "الفوترة" },
  { id: "p74", key: "billing.salaries.generate",   label: "توليد الرواتب",          description: "توليد الرواتب الشهرية تلقائياً",               category: "الفوترة" },
  { id: "p75", key: "billing.reports",             label: "تقارير الفوترة",         description: "عرض التقارير المالية والملخصات",               category: "الفوترة" },

  // === الإعدادات العامة ===
  { id: "p54", key: "settings.general", label: "الإعدادات العامة", description: "تعديل الإعدادات العامة للنظام", category: "الإعدادات" },
  { id: "p55", key: "settings.notifications", label: "إعدادات الإشعارات", description: "إدارة إعدادات الإشعارات", category: "الإعدادات" },
  { id: "p56", key: "settings.integrations", label: "التكاملات الخارجية", description: "إدارة التكاملات مع الخدمات الخارجية", category: "الإعدادات" },
  { id: "p57", key: "settings.backup", label: "النسخ الاحتياطي", description: "إدارة النسخ الاحتياطي واستعادة البيانات", category: "الإعدادات" },
  { id: "p58", key: "settings.logs", label: "سجل النظام", description: "عرض سجل العمليات والأحداث", category: "الإعدادات" },

  // === الإشعارات والرسائل ===
  { id: "p59", key: "notifications.view", label: "عرض الإشعارات", description: "عرض الإشعارات الواردة", category: "الإشعارات والرسائل" },
  { id: "p60", key: "notifications.send", label: "إرسال إشعارات", description: "إرسال إشعارات للمستخدمين", category: "الإشعارات والرسائل" },
  { id: "p61", key: "notifications.manage", label: "إدارة الإشعارات", description: "إدارة وأرشفة الإشعارات", category: "الإشعارات والرسائل" },
  { id: "p62", key: "messages.view", label: "عرض الرسائل", description: "عرض الرسائل الواردة والصادرة", category: "الإشعارات والرسائل" },
  { id: "p63", key: "messages.send", label: "إرسال رسائل", description: "إرسال رسائل للمستخدمين والعملاء", category: "الإشعارات والرسائل" },
]

// ==================== الأدوار الافتراضية ====================
const DEFAULT_ROLES: Role[] = [
  {
    id: "role_1",
    name: "owner",
    name_ar: "المالك",
    description: "صلاحيات كاملة غير محدودة على كل النظام",
    color: "#dc2626",
    icon: "👑",
    is_system: true,
    created_at: "2024-01-01",
    permissions: DEFAULT_PERMISSIONS.map(p => ({ permission_id: p.id, granted: true })),
  },
  {
    id: "role_2",
    name: "general_manager",
    name_ar: "المدير العام",
    description: "إدارة كاملة مع صلاحيات واسعة جداً",
    color: "#9333ea",
    icon: "🏆",
    is_system: true,
    created_at: "2024-01-01",
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      permission_id: p.id,
      granted: !["settings.backup", "settings.logs", "users.permissions"].includes(p.key),
    })),
  },
  {
    id: "role_3",
    name: "manager",
    name_ar: "مدير",
    description: "إدارة الفريق والعمليات اليومية",
    color: "#2563eb",
    icon: "📋",
    is_system: true,
    created_at: "2024-01-01",
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      permission_id: p.id,
      granted: p.category !== "الإعدادات" && !p.key.includes("delete") && !p.key.includes("permissions") && p.key !== "billing.salaries.generate" && p.key !== "billing.invoices.generate",
    })),
  },
  {
    id: "role_4",
    name: "team_leader",
    name_ar: "قائد فريق",
    description: "قيادة الفريق ومتابعة المهام والحضور",
    color: "#d97706",
    icon: "🎯",
    is_system: true,
    created_at: "2024-01-01",
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      permission_id: p.id,
      granted: ["dashboard.view","dashboard.stats","tasks.view","tasks.create","tasks.edit","tasks.toggle","tasks.assign","tasks.categories","attendance.view","attendance.checkin","attendance.checkout","attendance.manage","attendance.reports","clients.view","clients.details","clients.notes","reports.view","reports.performance","notifications.view","notifications.send","messages.view","messages.send","stores.view","stores.details","billing.view","billing.invoices.view","billing.commissions.view","billing.bonuses.view","billing.salaries.view","billing.reports"].includes(p.key),
    })),
  },
  {
    id: "role_5",
    name: "account_manager",
    name_ar: "مدير حساب",
    description: "إدارة حسابات العملاء والمتاجر",
    color: "#ec4899",
    icon: "💼",
    is_system: true,
    created_at: "2024-01-01",
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      permission_id: p.id,
      granted: ["إدارة المتاجر","إدارة العملاء","التقارير والتحليلات","المتجر","لوحة التحكم","إدارة المهام"].includes(p.category)
        && !p.key.includes("delete") && !p.key.includes("permissions"),
    })),
  },
  {
    id: "role_6",
    name: "media_buyer",
    name_ar: "ميديا باير",
    description: "إدارة الحملات الإعلانية والتقارير",
    color: "#6366f1",
    icon: "�",
    is_system: true,
    created_at: "2024-01-01",
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      permission_id: p.id,
      granted: ["dashboard.view","dashboard.stats","dashboard.export","reports.view","reports.sales","reports.financial","reports.performance","reports.export","stores.view","stores.details","clients.view","clients.details","clients.export","notifications.view","messages.view"].includes(p.key),
    })),
  },
  {
    id: "role_7",
    name: "designer",
    name_ar: "مصمم",
    description: "إنشاء وتعديل التصاميم والمحتوى المرئي",
    color: "#0891b2",
    icon: "🎨",
    is_system: true,
    created_at: "2024-01-01",
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      permission_id: p.id,
      granted: ["dashboard.view","dashboard.stats","stores.view","stores.details","clients.view","clients.details","tasks.view","tasks.toggle","notifications.view","messages.view","messages.send"].includes(p.key),
    })),
  },
  {
    id: "role_8",
    name: "content_writer",
    name_ar: "كاتب محتوى",
    description: "كتابة وتحرير المحتوى النصي",
    color: "#059669",
    icon: "✍️",
    is_system: true,
    created_at: "2024-01-01",
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      permission_id: p.id,
      granted: ["dashboard.view","dashboard.stats","stores.view","stores.details","clients.view","clients.details","tasks.view","tasks.toggle","notifications.view","messages.view","messages.send"].includes(p.key),
    })),
  },
]

const ROLE_COLORS = [
  "#dc2626", "#ea580c", "#d97706", "#65a30d", "#059669",
  "#0891b2", "#2563eb", "#7c3aed", "#c026d3", "#e11d48",
  "#78716c", "#0f766e", "#4f46e5", "#9333ea", "#be185d",
]

const ROLE_ICONS = ["👑", "🛡️", "📋", "👤", "👁️", "⚡", "🎯", "🔧", "📊", "💼", "🏪", "📦", "💰", "🔔", "⭐"]

// ==================== المكون الرئيسي ====================
export default function PermissionsPage() {
  const { branding } = useBranding()
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewRoleModal, setShowNewRoleModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(DEFAULT_PERMISSIONS.map(p => p.category)))
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [activeTab, setActiveTab] = useState<"permissions" | "overview">("permissions")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/permissions?type=all')
      const data = await res.json()
      if (data.roles && data.roles.length > 0) {
        setRoles(data.roles)
        setAllPermissions(data.permissions || DEFAULT_PERMISSIONS)
        setSelectedRole(data.roles[0])
      } else {
        // fallback للبيانات الافتراضية إذا لم تُنفَّذ migration بعد
        setRoles(DEFAULT_ROLES)
        setSelectedRole(DEFAULT_ROLES[0])
      }
    } catch {
      setRoles(DEFAULT_ROLES)
      setSelectedRole(DEFAULT_ROLES[0])
    } finally {
      setLoading(false)
    }
  }

  function getCategories(): string[] {
    const cats = new Set(allPermissions.map(p => p.category))
    return Array.from(cats)
  }

  function getPermissionsByCategory(category: string): Permission[] {
    return allPermissions.filter(p => p.category === category)
  }

  function isPermissionGranted(role: Role, permissionId: string): boolean {
    const rp = role.permissions.find(p => p.permission_id === permissionId)
    return rp?.granted ?? false
  }

  function getCategoryGrantCount(role: Role, category: string): { granted: number; total: number } {
    const perms = getPermissionsByCategory(category)
    const granted = perms.filter(p => isPermissionGranted(role, p.id)).length
    return { granted, total: perms.length }
  }

  function isCategoryFullyGranted(role: Role, category: string): boolean {
    const { granted, total } = getCategoryGrantCount(role, category)
    return granted === total
  }

  function isCategoryPartiallyGranted(role: Role, category: string): boolean {
    const { granted, total } = getCategoryGrantCount(role, category)
    return granted > 0 && granted < total
  }

  const togglePermission = useCallback((permissionId: string) => {
    if (!selectedRole) return
    setRoles(prev =>
      prev.map(r => {
        if (r.id !== selectedRole.id) return r
        const updated = {
          ...r,
          permissions: r.permissions.map(p =>
            p.permission_id === permissionId ? { ...p, granted: !p.granted } : p
          ),
        }
        return updated
      })
    )
    setSelectedRole(prev => {
      if (!prev || prev.id !== selectedRole.id) return prev
      return {
        ...prev,
        permissions: prev.permissions.map(p =>
          p.permission_id === permissionId ? { ...p, granted: !p.granted } : p
        ),
      }
    })
    setHasChanges(true)
  }, [selectedRole])

  const toggleCategory = useCallback((category: string) => {
    if (!selectedRole) return
    const shouldGrant = !isCategoryFullyGranted(selectedRole, category)
    const categoryPermIds = getPermissionsByCategory(category).map(p => p.id)

    setRoles(prev =>
      prev.map(r => {
        if (r.id !== selectedRole.id) return r
        return {
          ...r,
          permissions: r.permissions.map(p =>
            categoryPermIds.includes(p.permission_id) ? { ...p, granted: shouldGrant } : p
          ),
        }
      })
    )
    setSelectedRole(prev => {
      if (!prev) return prev
      return {
        ...prev,
        permissions: prev.permissions.map(p =>
          categoryPermIds.includes(p.permission_id) ? { ...p, granted: shouldGrant } : p
        ),
      }
    })
    setHasChanges(true)
  }, [selectedRole])

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_permissions',
          role_id: selectedRole.id,
          permissions: selectedRole.permissions,
        }),
      })
      if (!res.ok) throw new Error('فشل الحفظ')
      setHasChanges(false)
      showToast("تم حفظ الصلاحيات بنجاح", "success")
    } catch {
      showToast("فشل في حفظ الصلاحيات", "error")
    } finally {
      setSaving(false)
    }
  }

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleDeleteRole = async (roleId: string) => {
    try {
      const res = await fetch(`/api/permissions?role_id=${roleId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'فشل الحذف')
      }
      setRoles(prev => prev.filter(r => r.id !== roleId))
      if (selectedRole?.id === roleId) {
        setSelectedRole(roles.find(r => r.id !== roleId) || null)
      }
      setShowDeleteConfirm(null)
      showToast("تم حذف الدور بنجاح", "success")
    } catch (err: any) {
      showToast(err.message || "فشل في حذف الدور", "error")
      setShowDeleteConfirm(null)
    }
  }

  const totalGranted = selectedRole
    ? selectedRole.permissions.filter(p => p.granted).length
    : 0
  const totalPerms = allPermissions.length
  const grantedPercent = Math.round((totalGranted / totalPerms) * 100)

  const filteredPermissions = searchQuery
    ? allPermissions.filter(
        p =>
          p.label.includes(searchQuery) ||
          p.description.includes(searchQuery) ||
          p.key.includes(searchQuery) ||
          p.category.includes(searchQuery)
      )
    : allPermissions

  const filteredCategories = searchQuery
    ? [...new Set(filteredPermissions.map(p => p.category))]
    : getCategories()

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-white/40 text-sm">جاري تحميل الصلاحيات...</div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0a0118] text-white" style={{ fontFamily: "'Tajawal', 'IBM Plex Sans Arabic', sans-serif" }}>
      {/* خط Tajawal من Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');

        * { box-sizing: border-box; }

        .glass-card {
          background: rgba(88, 28, 135, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.15);
          backdrop-filter: blur(20px);
        }

        .role-card {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .role-card:hover {
          background: rgba(139, 92, 246, 0.12);
          transform: translateX(-2px);
          border-color: rgba(139, 92, 246, 0.3);
        }
        .role-card.active {
          background: rgba(139, 92, 246, 0.18);
          border-color: rgba(139, 92, 246, 0.4);
        }

        .toggle-switch {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toggle-switch.off {
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        .toggle-switch.on {
          background: #7c3aed;
        }
        .toggle-switch::after {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          top: 3px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toggle-switch.off::after {
          right: 3px;
        }
        .toggle-switch.on::after {
          right: 23px;
        }

        .permission-row {
          transition: all 0.15s ease;
        }
        .permission-row:hover {
          background: rgba(139, 92, 246, 0.06);
        }

        .category-header {
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .category-header:hover {
          background: rgba(139, 92, 246, 0.08);
        }

        .progress-ring {
          transform: rotate(-90deg);
        }

        .floating-save {
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        .toast {
          animation: toastIn 0.3s ease;
        }

        @keyframes toastIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-overlay {
          animation: fadeIn 0.2s ease;
        }
        .modal-content {
          animation: scaleIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .checkbox-category {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .checkbox-category.checked {
          background: #10b981;
          border-color: #10b981;
        }
        .checkbox-category.partial {
          background: #f59e0b;
          border-color: #f59e0b;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="toast fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-2xl"
          style={{
            background: toast.type === "success" ? "#065f46" : "#7f1d1d",
            border: `1px solid ${toast.type === "success" ? "#10b981" : "#ef4444"}`,
          }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          {/* العنوان */}
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>إدارة الصلاحيات والأدوار</h1>
              <p className="text-purple-300/70 text-xs sm:text-sm">تحكم كامل في صلاحيات كل دور على كل ميزة في النظام</p>
            </div>
          </div>
          {/* أزرار الهيدر */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* تبويبات */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("permissions")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "permissions"
                    ? "bg-purple-600 text-white shadow"
                    : "text-white/50 hover:text-white/80"
                }`}>
                الصلاحيات
              </button>
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "overview"
                    ? "bg-purple-600 text-white shadow"
                    : "text-white/50 hover:text-white/80"
                }`}>
                نظرة عامة
              </button>
            </div>
            {/* زر دور جديد */}
            <button
              onClick={() => setShowNewRoleModal(true)}
              className="p-3 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-xl transition-all"
              title="إضافة دور جديد"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {/* زر العودة لصفحة المستخدمين */}
            <Link
              href="/admin/users"
              className="p-3 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all"
              title="العودة لإدارة المستخدمين"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {activeTab === "permissions" ? (
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="flex gap-6" style={{ minHeight: "calc(100vh - 120px)" }}>
            {/* === القائمة الجانبية - الأدوار === */}
            <div className="w-[280px] flex-shrink-0">
              <div className="glass-card rounded-2xl p-4 sticky top-24">
                <h3 className="text-sm font-bold text-purple-300/80 mb-3 px-2">الأدوار ({roles.length})</h3>
                <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin">
                  {roles.map(role => {
                    const roleGranted = role.permissions.filter(p => p.granted).length
                    const rolePercent = Math.round((roleGranted / totalPerms) * 100)
                    return (
                      <div
                        key={role.id}
                        onClick={() => { setSelectedRole(role); }}
                        className={`role-card rounded-xl p-3 glass-card ${selectedRole?.id === role.id ? "active" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: `${role.color}20`, border: `1px solid ${role.color}40` }}
                          >
                            {role.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white truncate">{role.name_ar}</span>
                              {role.is_system && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400/60">نظام</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 rounded-full bg-purple-900/40 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${rolePercent}%`, background: role.color }}
                                />
                              </div>
                              <span className="text-[10px] text-purple-400/60 flex-shrink-0">{rolePercent}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* === المحتوى الرئيسي - الصلاحيات === */}
            <div className="flex-1 min-w-0">
              {selectedRole ? (
                <>
                  {/* معلومات الدور المحدد */}
                  <div className="glass-card rounded-2xl p-5 mb-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                          style={{ background: `${selectedRole.color}15`, border: `1px solid ${selectedRole.color}30` }}
                        >
                          {selectedRole.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white">{selectedRole.name_ar}</h2>
                            <span
                              className="text-xs px-2 py-1 rounded-full font-mono"
                              style={{ background: `${selectedRole.color}15`, color: selectedRole.color }}
                            >
                              {selectedRole.name}
                            </span>
                          </div>
                          <p className="text-sm text-white/40 mt-1">{selectedRole.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Progress Circle */}
                        <div className="relative w-16 h-16">
                          <svg className="progress-ring w-16 h-16" viewBox="0 0 60 60">
                            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="4" />
                            <circle
                              cx="30" cy="30" r="26" fill="none"
                              stroke={selectedRole.color}
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={`${(grantedPercent / 100) * 163.36} 163.36`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold" style={{ color: selectedRole.color }}>{grantedPercent}%</span>
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-2xl font-bold text-white">{totalGranted}</div>
                          <div className="text-xs text-purple-300/60">من {totalPerms} صلاحية</div>
                        </div>
                        {/* أزرار التحرير والحذف */}
                        <div className="flex gap-2 mr-4">
                          <button
                            onClick={() => setEditingRole(selectedRole)}
                            className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300/70 hover:text-white transition-all"
                            title="تعديل الدور"
                          >
                            ✏️
                          </button>
                          {!selectedRole.is_system && (
                            <button
                              onClick={() => setShowDeleteConfirm(selectedRole.id)}
                              className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                              title="حذف الدور"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* بحث */}
                  <div className="glass-card rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                    <span className="text-purple-400/50">🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="ابحث في الصلاحيات..."
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-purple-300/30"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-purple-400/40 hover:text-purple-300 text-sm">✕</button>
                    )}
                  </div>

                  {/* قائمة الصلاحيات */}
                  <div className="space-y-3">
                    {filteredCategories.map(category => {
                      const isExpanded = expandedCategories.has(category)
                      const { granted, total } = getCategoryGrantCount(selectedRole, category)
                      const categoryPerms = searchQuery
                        ? filteredPermissions.filter(p => p.category === category)
                        : getPermissionsByCategory(category)
                      const isFullyGranted = isCategoryFullyGranted(selectedRole, category)
                      const isPartial = isCategoryPartiallyGranted(selectedRole, category)

                      // Group by subcategory
                      const subcategories = new Map<string, Permission[]>()
                      categoryPerms.forEach(p => {
                        const sub = p.subcategory || ""
                        if (!subcategories.has(sub)) subcategories.set(sub, [])
                        subcategories.get(sub)!.push(p)
                      })

                      return (
                        <div key={category} className="glass-card rounded-2xl overflow-hidden">
                          {/* Category Header */}
                          <div
                            className="category-header flex items-center justify-between px-5 py-4"
                            onClick={() => toggleCategoryExpansion(category)}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`checkbox-category ${isFullyGranted ? "checked" : isPartial ? "partial" : ""}`}
                                onClick={e => { e.stopPropagation(); toggleCategory(category); }}
                              >
                                {isFullyGranted && <span className="text-white text-xs">✓</span>}
                                {isPartial && <span className="text-white text-xs">—</span>}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white">{category}</h3>
                                <p className="text-xs text-purple-300/50 mt-0.5">{granted} من {total} صلاحية مفعّلة</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-1.5 rounded-full bg-purple-900/40 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${total > 0 ? (granted / total) * 100 : 0}%`,
                                    background: granted === total ? "#10b981" : granted > 0 ? "#f59e0b" : "transparent",
                                  }}
                                />
                              </div>
                              <span className="text-purple-400/40 text-xs transition-transform duration-200"
                                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                                ▼
                              </span>
                            </div>
                          </div>

                          {/* Permission Rows */}
                          {isExpanded && (
                            <div className="border-t border-purple-500/10">
                              {[...subcategories.entries()].map(([subcat, perms]) => (
                                <div key={subcat}>
                                  {subcat && (
                                    <div className="px-5 py-2 bg-purple-500/5">
                                      <span className="text-xs font-bold text-purple-300/40">{subcat}</span>
                                    </div>
                                  )}
                                  {perms.map((perm, idx) => (
                                    <div
                                      key={perm.id}
                                      className="permission-row flex items-center justify-between px-5 py-3"
                                      style={{ borderTop: idx > 0 || subcat ? "1px solid rgba(139,92,246,0.08)" : "none" }}
                                    >
                                      <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-white/90">{perm.label}</span>
                                          <span className="text-[10px] font-mono text-purple-400/25 hidden sm:inline">{perm.key}</span>
                                        </div>
                                        <p className="text-xs text-purple-300/40 mt-0.5">{perm.description}</p>
                                      </div>
                                      <div
                                        className={`toggle-switch ${isPermissionGranted(selectedRole, perm.id) ? "on" : "off"}`}
                                        onClick={() => togglePermission(perm.id)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="glass-card rounded-2xl p-20 text-center">
                  <span className="text-4xl mb-4 block">🔐</span>
                  <h3 className="text-lg font-bold text-purple-300/60">اختر دوراً لعرض صلاحياته</h3>
                  <p className="text-sm text-purple-300/40 mt-2">اختر من القائمة الجانبية لبدء إدارة الصلاحيات</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* === تبويب نظرة عامة === */
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {roles.map(role => {
              const roleGranted = role.permissions.filter(p => p.granted).length
              const rolePercent = Math.round((roleGranted / totalPerms) * 100)
              return (
                <div key={role.id} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${role.color}20`, border: `1px solid ${role.color}40` }}
                    >
                      {role.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{role.name_ar}</h3>
                      <p className="text-xs text-purple-300/50">{role.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {getCategories().map(cat => {
                      const { granted: cg, total: ct } = getCategoryGrantCount(role, cat)
                      return (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-xs text-purple-300/50 w-28 truncate">{cat}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-purple-900/40 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${ct > 0 ? (cg / ct) * 100 : 0}%`,
                                background: cg === ct ? "#10b981" : cg > 0 ? "#f59e0b" : "transparent",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-purple-400/40 w-8 text-left">{cg}/{ct}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-purple-500/10 flex items-center justify-between">
                    <span className="text-xs text-purple-300/50">{roleGranted} صلاحية من {totalPerms}</span>
                    <span className="text-sm font-bold" style={{ color: role.color }}>{rolePercent}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* جدول مقارنة الأدوار */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-500/10">
              <h3 className="text-sm font-bold text-white">مقارنة الصلاحيات بين الأدوار</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/10">
                    <th className="text-right text-xs font-bold text-purple-300/50 px-5 py-3">الصلاحية</th>
                    {roles.map(r => (
                      <th key={r.id} className="text-center text-xs font-bold px-3 py-3" style={{ color: r.color }}>
                        {r.icon} {r.name_ar}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getCategories().map(cat => (
                    <>
                      <tr key={`cat-${cat}`} className="bg-purple-500/5">
                        <td colSpan={roles.length + 1} className="px-5 py-2 text-xs font-bold text-purple-300/60">{cat}</td>
                      </tr>
                      {getPermissionsByCategory(cat).map(perm => (
                        <tr key={perm.id} className="border-t border-purple-500/5 hover:bg-purple-500/5">
                          <td className="px-5 py-2 text-xs text-white/80">{perm.label}</td>
                          {roles.map(r => (
                            <td key={r.id} className="text-center px-3 py-2">
                              <span className={`text-sm ${isPermissionGranted(r, perm.id) ? "text-emerald-400" : "text-white/10"}`}>
                                {isPermissionGranted(r, perm.id) ? "✓" : "—"}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* زر الحفظ العائم */}
      {hasChanges && (
        <div className="floating-save fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="glass-card rounded-2xl px-6 py-3 flex items-center gap-4 shadow-2xl border-violet-500/20">
            <span className="text-sm text-white/60">لديك تغييرات غير محفوظة</span>
            <button
              onClick={() => { setHasChanges(false); setSelectedRole(roles.find(r => r.id === selectedRole?.id) || selectedRole); }}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
            >
              تراجع
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
            </button>
          </div>
        </div>
      )}

      {/* مودال إضافة دور جديد */}
      {(showNewRoleModal || editingRole) && (
        <NewRoleModal
          editRole={editingRole}
          existingNames={roles.map(r => r.name)}
          onClose={() => { setShowNewRoleModal(false); setEditingRole(null); }}
          onSave={async (role) => {
            try {
              if (editingRole) {
                const res = await fetch('/api/permissions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'update_role', id: editingRole.id, ...role }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, ...data.role, permissions: r.permissions } : r))
                if (selectedRole?.id === editingRole.id) {
                  setSelectedRole(prev => prev ? { ...prev, ...data.role, permissions: prev.permissions } : null)
                }
                showToast("تم تعديل الدور بنجاح", "success")
              } else {
                const res = await fetch('/api/permissions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'create_role', ...role }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                const newRole: Role = {
                  ...data.role,
                  permissions: allPermissions.map(p => ({ role_id: data.role.id, permission_id: p.id, granted: false })),
                }
                setRoles(prev => [...prev, newRole])
                setSelectedRole(newRole)
                showToast("تم إضافة الدور بنجاح", "success")
              }
            } catch (err: any) {
              // fallback محلي إذا لم تُنفَّذ migration بعد
              if (editingRole) {
                setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, ...role, permissions: r.permissions } : r))
                if (selectedRole?.id === editingRole.id) {
                  setSelectedRole(prev => prev ? { ...prev, ...role, permissions: prev.permissions } : null)
                }
              } else {
                const newRole: Role = {
                  ...role, id: `role_${Date.now()}`, is_system: false,
                  created_at: new Date().toISOString().split("T")[0],
                  permissions: allPermissions.map(p => ({ role_id: '', permission_id: p.id, granted: false })),
                }
                setRoles(prev => [...prev, newRole])
                setSelectedRole(newRole)
              }
              showToast("تم الحفظ محلياً (تحقق من migration)", "success")
            }
            setShowNewRoleModal(false)
            setEditingRole(null)
          }}
        />
      )}

      {/* تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
              <h3 className="text-lg font-bold text-white mb-2">حذف الدور</h3>
              <p className="text-sm text-white/50 mb-6">
                هل أنت متأكد من حذف هذا الدور؟ سيتم إزالة جميع الصلاحيات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleDeleteRole(showDeleteConfirm)}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all"
                >
                  حذف الدور
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== مودال إضافة/تعديل دور ====================
function NewRoleModal({
  editRole,
  existingNames,
  onClose,
  onSave,
}: {
  editRole: Role | null
  existingNames: string[]
  onClose: () => void
  onSave: (role: Omit<Role, "id" | "is_system" | "created_at" | "permissions">) => void
}) {
  const [name, setName] = useState(editRole?.name || "")
  const [nameAr, setNameAr] = useState(editRole?.name_ar || "")
  const [description, setDescription] = useState(editRole?.description || "")
  const [color, setColor] = useState(editRole?.color || ROLE_COLORS[0])
  const [icon, setIcon] = useState(editRole?.icon || ROLE_ICONS[0])
  const [error, setError] = useState("")

  const handleSave = () => {
    if (!name.trim() || !nameAr.trim()) {
      setError("يرجى تعبئة الاسم بالعربي والإنجليزي")
      return
    }
    if (!editRole && existingNames.includes(name.trim())) {
      setError("اسم الدور موجود مسبقاً")
      return
    }
    onSave({ name: name.trim(), name_ar: nameAr.trim(), description: description.trim(), color, icon } as any)
  }

  return (
    <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="modal-content glass-card rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-5">
          {editRole ? "تعديل الدور" : "إضافة دور جديد"}
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">اسم الدور (عربي) *</label>
              <input
                value={nameAr}
                onChange={e => { setNameAr(e.target.value); setError(""); }}
                placeholder="مثال: محاسب"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500/50 transition-all placeholder:text-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">اسم الدور (إنجليزي) *</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value.replace(/[^a-zA-Z_]/g, "").toLowerCase()); setError(""); }}
                placeholder="مثال: accountant"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500/50 transition-all font-mono placeholder:text-white/20"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">الوصف</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="وصف مختصر لصلاحيات هذا الدور..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500/50 transition-all placeholder:text-white/20"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">الأيقونة</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    icon === ic ? "bg-violet-600/30 border border-violet-500/50 scale-110" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">اللون</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${color === c ? "scale-125 ring-2 ring-white/30" : "hover:scale-110"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
          >
            {editRole ? "حفظ التعديلات" : "إضافة الدور"}
          </button>
        </div>
      </div>
    </div>
  )
}
