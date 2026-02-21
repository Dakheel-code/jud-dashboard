"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"

interface Permission {
  id: string
  key: string
  label: string
  category: string
}

interface RolePermission {
  permission_id: string
  granted: boolean
}

interface Role {
  id: string
  name: string
  name_ar: string
  permissions: RolePermission[]
}

// === الهوك الأساسي ===
export function usePermissions() {
  const [permissionKeys, setPermissionKeys] = useState<string[]>([])
  const [roleName, setRoleName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentUserRole()
  }, [])

  const loadCurrentUserRole = async () => {
    try {
      const response = await fetch('/api/me')
      if (response.ok) {
        const data = await response.json()
        setPermissionKeys(data.user?.permissions || [])
        setRoleName(data.user?.role || null)
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }

  // فحص صلاحية واحدة
  const can = useCallback(
    (permissionKey: string): boolean => {
      if (roleName === 'super_admin') return true
      return permissionKeys.includes(permissionKey)
    },
    [permissionKeys, roleName]
  )

  // فحص أي صلاحية من مجموعة
  const canAny = useCallback(
    (keys: string[]): boolean => keys.some(key => can(key)),
    [can]
  )

  // فحص جميع الصلاحيات
  const canAll = useCallback(
    (keys: string[]): boolean => keys.every(key => can(key)),
    [can]
  )

  // هل المستخدم مدير نظام
  const isSuperAdmin = useMemo(() => roleName === 'super_admin', [roleName])

  return { can, canAny, canAll, isSuperAdmin, roleName, loading }
}

// === مكون حارس الصلاحيات ===
interface PermissionGateProps {
  permission?: string
  anyOf?: string[]
  allOf?: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions()

  let hasAccess = false
  if (permission) hasAccess = can(permission)
  else if (anyOf) hasAccess = canAny(anyOf)
  else if (allOf) hasAccess = canAll(allOf)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
