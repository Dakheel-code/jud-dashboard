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
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState('settings');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);

  // مجموعة الأيقونات المتاحة للأقسام
  const categoryIcons: Record<string, { name: string; svg: string }> = {
    settings: { name: 'إعدادات', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />' },
    rocket: { name: 'إطلاق', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />' },
    megaphone: { name: 'تسويق', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />' },
    truck: { name: 'شحن', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />' },
    creditCard: { name: 'دفع', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />' },
    palette: { name: 'تصميم', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />' },
    users: { name: 'عملاء', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />' },
    chart: { name: 'تحليلات', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />' },
    star: { name: 'مميز', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />' },
    gift: { name: 'عروض', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />' },
    shield: { name: 'أمان', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />' },
    globe: { name: 'عالمي', svg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />' },
  };
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
        setResultModalType('success');
        setResultModalMessage(editingTask ? 'تم تعديل المهمة بنجاح!' : 'تم إضافة المهمة بنجاح!');
        setShowResultModal(true);
        setEditingTask(null);
        setFormData({ title: '', description: '', category: categories[0], order_index: 0 });
      } else {
        setResultModalType('error');
        setResultModalMessage(editingTask ? 'فشل تعديل المهمة.' : 'فشل إضافة المهمة.');
        setShowResultModal(true);
      }
    } catch (err) {
      console.error('Failed to save task:', err);
      setResultModalType('error');
      setResultModalMessage('حدث خطأ أثناء حفظ المهمة.');
      setShowResultModal(true);
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
      setSelectedCategoryIcon('settings');
      setShowCategoryModal(false);
      setResultModalType('success');
      setResultModalMessage('تم إضافة القسم بنجاح!');
      setShowResultModal(true);
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

  const openEditCategoryModal = (category: string) => {
    setEditingCategory(category);
    setEditedCategoryName(category);
    setShowEditCategoryModal(true);
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editedCategoryName.trim()) return;
    if (editedCategoryName.trim() === editingCategory) {
      setShowEditCategoryModal(false);
      return;
    }
    
    setShowEditCategoryModal(false);
    
    try {
      const tasksInCategory = groupedTasks[editingCategory] || [];
      
      for (const task of tasksInCategory) {
        await fetch(`/api/admin/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            category: editedCategoryName.trim(),
            order_index: task.order_index
          })
        });
      }
      
      await fetchTasks();
      setResultModalType('success');
      setResultModalMessage('تم تعديل اسم القسم بنجاح!');
    } catch (err) {
      console.error('Failed to edit category:', err);
      setResultModalType('error');
      setResultModalMessage('فشل تعديل القسم. حاول مرة أخرى.');
    } finally {
      setEditingCategory(null);
      setEditedCategoryName('');
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
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditCategoryModal(category)}
                    className="p-2 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-lg transition-all"
                    title="تعديل القسم"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
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
          <div className="bg-purple-950/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-500/30 max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
              <div>
                <label className="block text-white mb-3 text-sm font-medium">اختر أيقونة القسم</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {Object.entries(categoryIcons).map(([key, icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedCategoryIcon(key)}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                        selectedCategoryIcon === key
                          ? 'border-purple-400 bg-purple-500/30 text-purple-300'
                          : 'border-purple-500/30 bg-purple-900/20 text-purple-400 hover:border-purple-400/50 hover:bg-purple-500/10'
                      }`}
                      title={icon.name}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: icon.svg }} />
                      <span className="text-xs truncate w-full text-center">{icon.name}</span>
                    </button>
                  ))}
                </div>
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
                    setSelectedCategoryIcon('settings');
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

      {/* Edit Category Modal */}
      {showEditCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-950/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-500/30 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">تعديل اسم القسم</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2 text-sm font-medium">اسم القسم</label>
                <input
                  type="text"
                  value={editedCategoryName}
                  onChange={(e) => setEditedCategoryName(e.target.value)}
                  placeholder="اسم القسم الجديد"
                  className="w-full px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleEditCategory()}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleEditCategory}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all"
                >
                  حفظ التعديل
                </button>
                <button
                  onClick={() => {
                    setShowEditCategoryModal(false);
                    setEditingCategory(null);
                    setEditedCategoryName('');
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
