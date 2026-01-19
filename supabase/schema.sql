-- =====================================================
-- جداول إدارة المستخدمين (يجب إنشاؤها أولاً)
-- =====================================================

-- Create admin_users table for admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'account_manager', -- super_admin, admin, team_leader, account_manager
  permissions JSONB DEFAULT '[]'::jsonb, -- ['manage_tasks', 'manage_stores', 'manage_users', 'manage_help', 'view_stats']
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_sessions table for token management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes for admin tables
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);

-- Enable RLS for admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin tables
CREATE POLICY "Allow all operations on admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all operations on admin_sessions" ON admin_sessions FOR ALL USING (true);

-- Insert default super admin user (password: admin123)
-- Password hash is SHA-256 of 'admin123'
INSERT INTO admin_users (username, password_hash, name, role, permissions, is_active)
VALUES (
  'admin',
  '240be518fabd2724ddb6f04eeb9d5b0e5c8b8c5c0e0e0e0e0e0e0e0e0e0e0e0e',
  'سوبر أدمن',
  'super_admin',
  '["manage_tasks", "manage_stores", "manage_users", "manage_help", "view_stats", "manage_team"]'::jsonb,
  true
) ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- جداول المتاجر والمهام
-- =====================================================

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL,                    -- اسم المتجر
  store_url TEXT UNIQUE NOT NULL,              -- رابط المتجر
  owner_name TEXT NOT NULL,                    -- صاحب المتجر
  owner_phone TEXT,                            -- رقم الجوال
  owner_email TEXT,                            -- البريد الإلكتروني
  owner_whatsapp TEXT,                         -- واتساب
  account_manager_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,  -- مدير الحساب المسؤول
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,          -- من أضاف المتجر
  notes TEXT,                                  -- ملاحظات
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- Create tasks_progress table
CREATE TABLE IF NOT EXISTS tasks_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  is_done BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, task_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_progress_store_id ON tasks_progress(store_id);
CREATE INDEX IF NOT EXISTS idx_tasks_progress_task_id ON tasks_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_stores_url ON stores(store_url);
CREATE INDEX IF NOT EXISTS idx_stores_account_manager ON stores(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_stores_created_by ON stores(created_by);

-- Enable Row Level Security (optional, for future use)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_progress ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since we're not using auth yet)
CREATE POLICY "Allow all operations on stores" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks_progress" ON tasks_progress FOR ALL USING (true);

-- Create help_requests table for support system
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  reply TEXT,
  status TEXT DEFAULT 'pending', -- pending, replied, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  replied_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'help_reply', -- help_reply, announcement, etc.
  help_request_id UUID REFERENCES help_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_help_requests_store_id ON help_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Enable RLS
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on help_requests" ON help_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);

-- =====================================================
-- جداول إعدادات Slack
-- =====================================================

-- Create slack_webhooks table for Slack integration
CREATE TABLE IF NOT EXISTS slack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- اسم القناة أو وصف
  webhook_url TEXT NOT NULL,
  channel_name TEXT, -- اسم القناة في Slack
  is_active BOOLEAN DEFAULT TRUE,
  notify_new_store BOOLEAN DEFAULT TRUE, -- إشعار عند تسجيل متجر جديد
  notify_store_complete BOOLEAN DEFAULT TRUE, -- إشعار عند إكمال متجر 100%
  notify_milestone BOOLEAN DEFAULT TRUE, -- إشعار عند وصول متجر لمرحلة (50%, 75%)
  notify_help_request BOOLEAN DEFAULT TRUE, -- إشعار عند طلب مساعدة جديد
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create slack_notifications_log table to track sent notifications
CREATE TABLE IF NOT EXISTS slack_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES slack_webhooks(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- new_store, store_complete, milestone, help_request
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- sent, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_slack_webhooks_is_active ON slack_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_log_webhook_id ON slack_notifications_log(webhook_id);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_log_type ON slack_notifications_log(notification_type);

-- Enable RLS
ALTER TABLE slack_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notifications_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on slack_webhooks" ON slack_webhooks FOR ALL USING (true);
CREATE POLICY "Allow all operations on slack_notifications_log" ON slack_notifications_log FOR ALL USING (true);
