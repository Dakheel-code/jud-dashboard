'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  order_index: number;
}

export default function TasksManagementPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'الإعدادات الأساسية',
    'التصميم والمحتوى',
    'التسويق والإطلاق'
  ]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    order_index: 0
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/admin/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      
      // استخراج الأقسام الفريدة من المهام
      const uniqueCategories = Array.from(new Set(data.tasks?.map((t: Task) => t.category) || []));
      if (uniqueCategories.length > 0) {
        setCategories(uniqueCategories as string[]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingTask 
        ? `/api/admin/tasks/${editingTask.id}`
        : '/api/admin/tasks';
      
      const method = editingTask ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchTasks();
        setShowAddModal(false);
        setEditingTask(null);
        setFormData({ title: '', description: '', category: categories[0], order_index: 0 });
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
    
    try {
      const response = await fetch(`/api/admin/tasks/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      category: task.category,
      order_index: task.order_index
    });
    setShowAddModal(true);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
      setShowCategoryModal(false);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    const tasksInCategory = groupedTasks[category] || [];
    const taskCount = tasksInCategory.length;
    
    if (!confirm(`هل أنت متأكد من حذف قسم "${category}"؟\nسيتم حذف ${taskCount} مهمة من هذا القسم.`)) {
      return;
    }
    
    try {
      // حذف جميع المهام في هذا القسم
      for (const task of tasksInCategory) {
        await fetch(`/api/admin/tasks/${task.id}`, {
          method: 'DELETE'
        });
      }
      
      // تحديث القائمة
      await fetchTasks();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert('فشل حذف القسم. حاول مرة أخرى.');
    }
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-white">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain"
            />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-white mb-1">
                إدارة المهام والأقسام
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">إضافة وتعديل وحذف المهام</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                setEditingTask(null);
                setFormData({ title: '', description: '', category: categories[0] || '', order_index: tasks.length });
                setShowAddModal(true);
              }}
              className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-fuchsia-700 transition-all shadow-lg"
            >
              + مهمة جديدة
            </button>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-yellow-700 transition-all shadow-lg"
            >
              + قسم جديد
            </button>
            <Link
              href="/admin"
              className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm text-purple-300 hover:text-white bg-purple-900/30 hover:bg-purple-800/50 rounded-xl transition-all border border-purple-500/30"
            >
              العودة
            </Link>
          </div>
        </div>

        {/* Tasks by Category */}
        <div className="space-y-6">
          {Object.keys(groupedTasks).sort((a, b) => {
            // ترتيب الأقسام حسب أقل order_index في كل قسم
            const minOrderA = Math.min(...(groupedTasks[a]?.map(t => t.order_index) || [Infinity]));
            const minOrderB = Math.min(...(groupedTasks[b]?.map(t => t.order_index) || [Infinity]));
            return minOrderA - minOrderB;
          }).map(category => (
            <div key={category} className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">{category}</h2>
                <button
                  onClick={() => handleDeleteCategory(category)}
                  className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all text-sm flex items-center gap-2"
                  title="حذف القسم بالكامل"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  حذف القسم
                </button>
              </div>
              <div className="space-y-3">
                {groupedTasks[category]?.sort((a, b) => a.order_index - b.order_index).map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-purple-900/30 p-4 rounded-xl border border-purple-500/20 hover:bg-purple-900/50 transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-purple-300 font-mono text-sm">#{task.order_index}</span>
                      <span className="text-white">{task.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(task)}
                        className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-all text-sm"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )) || <p className="text-purple-300/60 text-center py-4">لا توجد مهام في هذا القسم</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-950/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-500/30 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">إضافة قسم جديد</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2 text-sm font-medium">اسم القسم</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="مثال: الشحن والتوصيل"
                  className="w-full px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddCategory}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-yellow-700 transition-all"
                >
                  إضافة القسم
                </button>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategory('');
                  }}
                  className="flex-1 py-3 bg-purple-900/50 text-white rounded-xl font-medium hover:bg-purple-900/70 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-950/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-500/30 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white mb-2 text-sm font-medium">عنوان المهمة</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-white mb-2 text-sm font-medium">شرح المهمة</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="أضف شرحاً تفصيلياً للمهمة..."
                  rows={3}
                  className="w-full px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-white mb-2 text-sm font-medium">القسم</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white mb-2 text-sm font-medium">الترتيب</label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-fuchsia-700 transition-all"
                >
                  {editingTask ? 'حفظ التعديلات' : 'إضافة المهمة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTask(null);
                    setFormData({ title: '', description: '', category: categories[0], order_index: 0 });
                  }}
                  className="flex-1 py-3 bg-purple-900/50 text-white rounded-xl font-medium hover:bg-purple-900/70 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
