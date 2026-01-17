'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import AdminAuth from '@/components/AdminAuth';
import AdminBottomNav from '@/components/AdminBottomNav';

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  order_index: number;
}

function TasksManagementContent() {
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

  // Modal states
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

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

  const openDeleteTaskModal = (id: string) => {
    setTaskToDelete(id);
    setShowDeleteTaskModal(true);
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    setShowDeleteTaskModal(false);
    
    try {
      const response = await fetch(`/api/admin/tasks/${taskToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTasks();
        setResultModalType('success');
        setResultModalMessage('تم حذف المهمة بنجاح!');
      } else {
        setResultModalType('error');
        setResultModalMessage('فشل حذف المهمة.');
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setResultModalType('error');
      setResultModalMessage('حدث خطأ أثناء حذف المهمة.');
    } finally {
      setTaskToDelete(null);
      setShowResultModal(true);
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

  const openDeleteCategoryModal = (category: string) => {
    setCategoryToDelete(category);
    setShowDeleteCategoryModal(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const tasksInCategory = groupedTasks[categoryToDelete] || [];
    setShowDeleteCategoryModal(false);
    
    try {
      for (const task of tasksInCategory) {
        await fetch(`/api/admin/tasks/${task.id}`, {
          method: 'DELETE'
        });
      }
      
      await fetchTasks();
      setResultModalType('success');
      setResultModalMessage('تم حذف القسم بنجاح!');
    } catch (err) {
      console.error('Failed to delete category:', err);
      setResultModalType('error');
      setResultModalMessage('فشل حذف القسم. حاول مرة أخرى.');
    } finally {
      setCategoryToDelete(null);
      setShowResultModal(true);
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 border-l-fuchsia-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-4 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Loading" 
                className="w-full h-full object-contain animate-pulse"
                style={{ filter: 'drop-shadow(0 0 15px rgba(167, 139, 250, 0.8)) drop-shadow(0 0 30px rgba(139, 92, 246, 0.6))' }}
              />
            </div>
          </div>
          <div className="text-xl text-white font-semibold">جاري التحميل...</div>
        </div>
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
              <h1 className="text-xl sm:text-3xl text-white mb-1" style={{ fontFamily: "'Suisse Intl', var(--font-cairo), sans-serif", fontWeight: 600 }}>
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
              className="p-3 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-xl transition-all"
              title="مهمة جديدة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="p-3 text-amber-400 border border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-500/10 rounded-xl transition-all"
              title="قسم جديد"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </button>
            <Link
              href="/admin"
              className="p-3 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all"
              title="العودة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
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
                  onClick={() => openDeleteCategoryModal(category)}
                  className="p-2 text-red-400 border border-red-500/30 hover:border-red-400/50 hover:bg-red-500/10 rounded-lg transition-all"
                  title="حذف القسم"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
                        className="p-2 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteTaskModal(task.id)}
                        className="p-2 text-red-400 border border-red-500/30 hover:border-red-400/50 hover:bg-red-500/10 rounded-lg transition-all"
                        title="حذف"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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

      {/* Delete Task Modal */}
      <Modal
        isOpen={showDeleteTaskModal}
        onClose={() => setShowDeleteTaskModal(false)}
        onConfirm={handleDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذه المهمة؟"
        type="confirm"
        confirmText="حذف"
        cancelText="إلغاء"
      />

      {/* Delete Category Modal */}
      <Modal
        isOpen={showDeleteCategoryModal}
        onClose={() => setShowDeleteCategoryModal(false)}
        onConfirm={handleDeleteCategory}
        title="تأكيد حذف القسم"
        message={`هل أنت متأكد من حذف قسم "${categoryToDelete}"؟\nسيتم حذف جميع المهام في هذا القسم.`}
        type="confirm"
        confirmText="حذف"
        cancelText="إلغاء"
      />

      {/* Result Modal */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title={resultModalType === 'success' ? 'نجاح' : 'خطأ'}
        message={resultModalMessage}
        type={resultModalType}
      />

      {/* Bottom Navigation for Mobile */}
      <AdminBottomNav />
      
      {/* Spacer for bottom nav */}
      <div className="h-20 lg:hidden"></div>
    </div>
  );
}

export default function TasksManagementPage() {
  return (
    <AdminAuth>
      <TasksManagementContent />
    </AdminAuth>
  );
}
