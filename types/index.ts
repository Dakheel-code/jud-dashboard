export interface Store {
  id: string;
  store_url: string;
  created_at: string;
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
}

export interface StoreWithProgress {
  id: string;
  store_url: string;
  created_at: string;
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
