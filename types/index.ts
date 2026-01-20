export type StoreStatus = 'new' | 'active' | 'paused' | 'expired';

export interface Store {
  id: string;
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone?: string;
  owner_email?: string;
  account_manager_id?: string;
  account_manager_name?: string;  // للعرض فقط
  client_id?: string;
  created_by?: string;
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
  budget?: string;
  status?: StoreStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  order_index: number;
}

export interface TaskProgress {
  id: string;
  store_id: string;
  task_id: string;
  is_done: boolean;
  updated_at: string;
}

export interface TaskWithProgress extends Task {
  is_done: boolean;
  description?: string;
}

export interface TasksByCategory {
  [category: string]: TaskWithProgress[];
}

export interface StoreStats {
  total_stores: number;
  average_completion: number;
  most_completed_category: string;
  least_completed_category: string;
  top_account_manager?: { id: string; name: string };
  lowest_account_manager?: { id: string; name: string };
}

export interface StoreWithProgress {
  id: string;
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone?: string;
  owner_email?: string;
  account_manager_id?: string;
  account_manager_name?: string;
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
  budget?: string;
  status?: StoreStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_tasks: number;
  completed_tasks: number;
  completion_percentage: number;
}

export interface HelpRequest {
  id: string;
  store_id: string;
  task_id?: string;
  message: string;
  reply?: string;
  status: 'pending' | 'replied' | 'closed';
  created_at: string;
  replied_at?: string;
  store_url?: string;
  task_title?: string;
}

export interface Notification {
  id: string;
  store_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  help_request_id?: string;
  created_at: string;
}

// =====================================================
// أنواع المستخدمين والصلاحيات - وكالة جود
// =====================================================

export type UserRole = 'super_admin' | 'admin' | 'team_leader' | 'account_manager' | 'media_buyer' | 'programmer' | 'designer' | 'web_developer';

export type Permission = 
  | 'manage_tasks'      // إدارة المهام
  | 'manage_stores'     // إدارة المتاجر
  | 'add_stores'        // إضافة متاجر جديدة (team_leader وأعلى)
  | 'manage_users'      // إدارة المستخدمين
  | 'manage_help'       // إدارة طلبات المساعدة
  | 'view_stats'        // عرض الإحصائيات
  | 'manage_team';      // إدارة الفريق

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  permissions: Permission[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

// صلاحيات كل دور
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ['manage_tasks', 'manage_stores', 'add_stores', 'manage_users', 'manage_help', 'view_stats', 'manage_team'],
  admin: ['manage_tasks', 'manage_stores', 'add_stores', 'manage_help', 'view_stats', 'manage_team'],
  team_leader: ['manage_tasks', 'add_stores', 'manage_help', 'view_stats'],
  account_manager: ['view_stats'],
  media_buyer: ['view_stats'],
  programmer: ['view_stats'],
  designer: ['view_stats'],
  web_developer: ['view_stats']
};

// أسماء الأدوار بالعربي
export const ROLE_NAMES: Record<UserRole, string> = {
  super_admin: 'سوبر أدمن',
  admin: 'أدمن',
  team_leader: 'تيم ليدر',
  account_manager: 'مدير حساب',
  media_buyer: 'ميديا باير',
  programmer: 'مبرمج',
  designer: 'مصمم',
  web_developer: 'مطور ويب'
};
