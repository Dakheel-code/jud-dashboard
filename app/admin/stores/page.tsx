'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StoreWithProgress } from '@/types';
import Modal from '@/components/ui/Modal';
import AdminAuth from '@/components/AdminAuth';
import AddStoreModal from '@/components/AddStoreModal';
import StoreImportExport from '@/components/StoreImportExport';


interface UserInfo {
  role: string;
  permissions: string[];
}

function StoresPageContent() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [storeToDelete, setStoreToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingStore, setDeletingStore] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<StoreWithProgress | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // تبديل حالة البطاقة (مطوية/مفتوحة)
  const toggleCard = (storeId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) {
        newSet.delete(storeId);
      } else {
        newSet.add(storeId);
      }
      return newSet;
    });
  };

  // فلترة المتاجر
  const filteredStores = stores.filter(store => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'new' && (!store.status || store.status === 'new')) ||
      (statusFilter === 'completed' && store.completion_percentage === 100) ||
      store.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || 
      (priorityFilter === 'medium' && (!store.priority || store.priority === 'medium')) ||
      store.priority === priorityFilter;
    const matchesSearch = !searchQuery || 
      store.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.store_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.owner_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // دالة لعرض لون الأولوية
  const getPriorityBadge = (priority?: string) => {
    const p = priority || 'medium';
    switch (p) {
      case 'high':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">مرتفع</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">متوسط</span>;
      case 'low':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">منخفض</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">متوسط</span>;
    }
  };

  // دالة لعرض حالة المتجر
  const getStatusBadge = (status?: string) => {
    const s = status || 'new';
    switch (s) {
      case 'new':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">جديد</span>;
      case 'active':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">نشط</span>;
      case 'paused':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">متوقف</span>;
      case 'expired':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">منتهي</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">جديد</span>;
    }
  };

  // دالة لجلب شعار المتجر
  const getStoreLogo = (storeUrl: string) => {
    return `https://www.google.com/s2/favicons?domain=${storeUrl}&sz=64`;
  };

  // الأدوار المسموح لها بإضافة متاجر
  const canAddStore = userInfo && ['super_admin', 'admin', 'team_leader'].includes(userInfo.role);

  useEffect(() => {
    // جلب معلومات المستخدم من localStorage
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserInfo({ role: user.role, permissions: user.permissions || [] });
      } catch (e) {
        console.error('Error parsing user info:', e);
      }
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const storesRes = await fetch('/api/admin/stores', { cache: 'no-store' });
      const storesData = await storesRes.json();
      setStores(storesData.stores || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setLoading(false);
    }
  };

  const handleStoreSuccess = () => {
    setResultModalType('success');
    setResultModalMessage(editingStore ? 'تم تحديث المتجر بنجاح!' : 'تم إضافة المتجر بنجاح!');
    setShowResultModal(true);
    setEditingStore(null);
    fetchData();
  };

  const openEditModal = (store: StoreWithProgress) => {
    setEditingStore(store);
    setShowAddModal(true);
  };

  const openDeleteModal = (storeId: string, storeName: string) => {
    setStoreToDelete({ id: storeId, name: storeName });
    setShowDeleteModal(true);
  };

  // تغيير حالة المتجر
  const handleStatusChange = async (storeId: string, newStatus: string) => {
    console.log('handleStatusChange called:', storeId, newStatus);
    setShowStatusMenu(null);
    
    try {
      const token = localStorage.getItem('admin_token');
      console.log('Sending request to /api/admin/stores/status');
      
      const response = await fetch('/api/admin/stores/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: storeId, status: newStatus })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setResultModalType('success');
        setResultModalMessage('تم تحديث حالة المتجر بنجاح!');
        setShowResultModal(true);
        fetchData();
      } else {
        setResultModalType('error');
        setResultModalMessage(data.error || 'فشل تحديث حالة المتجر');
        setShowResultModal(true);
      }
    } catch (err) {
      console.error('Failed to update store status:', err);
      setResultModalType('error');
      setResultModalMessage('حدث خطأ أثناء تحديث حالة المتجر');
      setShowResultModal(true);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    
    setShowDeleteModal(false);
    setDeletingStore(storeToDelete.id);
    
    try {
      const response = await fetch(`/api/admin/stores/${storeToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok || data.success) {
        setResultModalType('success');
        setResultModalMessage('تم حذف المتجر بنجاح!');
        fetchData();
      } else {
        setResultModalType('error');
        setResultModalMessage(`فشل حذف المتجر: ${data.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error('Failed to delete store:', err);
      setResultModalType('error');
      setResultModalMessage('حدث خطأ أثناء حذف المتجر.');
    } finally {
      setDeletingStore(null);
      setStoreToDelete(null);
      setShowResultModal(true);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

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
        <div className="absolute w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl bottom-0 right-1/3 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                إدارة المتاجر
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">عرض وإدارة جميع المتاجر</p>
            </div>
          </div>
        </div>

        {/* Stats - Clickable for filtering */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border transition-all text-right ${statusFilter === 'all' ? 'border-purple-400 ring-2 ring-purple-500/30' : 'border-purple-500/20 hover:border-purple-400/50'}`}
          >
            <h3 className="text-sm text-purple-300/80 mb-1">إجمالي المتاجر</h3>
            <p className="text-2xl font-bold text-white">{stores.length}</p>
          </button>
          <button 
            onClick={() => setStatusFilter('new')}
            className={`bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border transition-all text-right ${statusFilter === 'new' ? 'border-blue-400 ring-2 ring-blue-500/30' : 'border-blue-500/20 hover:border-blue-400/50'}`}
          >
            <h3 className="text-sm text-blue-300/80 mb-1">المتاجر الجديدة</h3>
            <p className="text-2xl font-bold text-blue-400">{stores.filter(s => s.status === 'new' || !s.status).length}</p>
          </button>
          <button 
            onClick={() => setStatusFilter('active')}
            className={`bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border transition-all text-right ${statusFilter === 'active' ? 'border-green-400 ring-2 ring-green-500/30' : 'border-green-500/20 hover:border-green-400/50'}`}
          >
            <h3 className="text-sm text-green-300/80 mb-1">المتاجر النشطة</h3>
            <p className="text-2xl font-bold text-green-400">{stores.filter(s => s.status === 'active').length}</p>
          </button>
          <button 
            onClick={() => setStatusFilter('paused')}
            className={`bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border transition-all text-right ${statusFilter === 'paused' ? 'border-orange-400 ring-2 ring-orange-500/30' : 'border-orange-500/20 hover:border-orange-400/50'}`}
          >
            <h3 className="text-sm text-orange-300/80 mb-1">المتاجر المتوقفة</h3>
            <p className="text-2xl font-bold text-orange-400">{stores.filter(s => s.status === 'paused').length}</p>
          </button>
          <button 
            onClick={() => setStatusFilter('expired')}
            className={`bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border transition-all text-right ${statusFilter === 'expired' ? 'border-red-400 ring-2 ring-red-500/30' : 'border-red-500/20 hover:border-red-400/50'}`}
          >
            <h3 className="text-sm text-red-300/80 mb-1">المتاجر المنتهية</h3>
            <p className="text-2xl font-bold text-red-400">{stores.filter(s => s.status === 'expired').length}</p>
          </button>
          <button 
            onClick={() => setStatusFilter('completed')}
            className={`bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border transition-all text-right ${statusFilter === 'completed' ? 'border-fuchsia-400 ring-2 ring-fuchsia-500/30' : 'border-fuchsia-500/20 hover:border-fuchsia-400/50'}`}
          >
            <h3 className="text-sm text-fuchsia-300/80 mb-1">المتاجر المكتملة</h3>
            <p className="text-2xl font-bold text-fuchsia-400">{stores.filter(s => s.completion_percentage === 100).length}</p>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-purple-500/20 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
            {/* Search */}
            <div className="w-full sm:flex-1 sm:min-w-[200px]">
              <div className="relative">
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="بحث عن متجر..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none placeholder-purple-400/50"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-auto sm:min-w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-purple-900/50 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239333ea'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center', backgroundSize: '20px' }}
              >
                <option value="all" className="bg-[#1a0a2e] text-white py-2">جميع الحالات</option>
                <option value="new" className="bg-[#1a0a2e] text-white py-2">جديد</option>
                <option value="active" className="bg-[#1a0a2e] text-white py-2">نشط</option>
                <option value="paused" className="bg-[#1a0a2e] text-white py-2">متوقف</option>
                <option value="expired" className="bg-[#1a0a2e] text-white py-2">منتهي</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="w-full sm:w-auto sm:min-w-[150px]">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-purple-900/50 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239333ea'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center', backgroundSize: '20px' }}
              >
                <option value="all" className="bg-[#1a0a2e] text-white py-2">جميع الأولويات</option>
                <option value="high" className="bg-[#1a0a2e] text-white py-2">مرتفع</option>
                <option value="medium" className="bg-[#1a0a2e] text-white py-2">متوسط</option>
                <option value="low" className="bg-[#1a0a2e] text-white py-2">منخفض</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-purple-300">
              {filteredStores.length} من {stores.length} متجر
            </div>

            {/* أزرار الاستيراد والتصدير */}
            <div className="flex items-center gap-2 mr-auto">
              <StoreImportExport onImportSuccess={fetchData} />
            </div>
          </div>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className={`bg-purple-950/40 backdrop-blur-xl rounded-2xl overflow-hidden transition-all ${
                store.priority === 'high' 
                  ? 'border-2 border-red-500/50 hover:border-red-400/70' 
                  : store.priority === 'low' 
                    ? 'border border-purple-500/20 hover:border-purple-400/40' 
                    : 'border-2 border-orange-500/50 hover:border-orange-400/70'
              }`}
            >
              {/* Card Header - Always Visible (Clickable) */}
              <div 
                className="p-4 cursor-pointer select-none"
                onClick={() => toggleCard(store.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Store Logo */}
                    <div className="w-10 h-10 rounded-full bg-purple-900/50 border-2 border-purple-500/30 overflow-hidden flex-shrink-0">
                      <img 
                        src={getStoreLogo(store.store_url)} 
                        alt={store.store_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.png';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white truncate">{store.store_name}</h3>
                      <span className="text-sm text-purple-400 flex items-center gap-1">
                        {store.store_url}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(store.status)}
                    </div>
                    {/* Go to Store Page */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/store/${store.store_url}`);
                      }}
                      className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all"
                      title="فتح صفحة المتجر"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {/* Expand/Collapse Arrow */}
                    <svg 
                      className={`w-5 h-5 text-purple-400 transition-transform duration-300 ${expandedCards.has(store.id) ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expandable Content */}
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  expandedCards.has(store.id) ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                {/* Card Body */}
                <div className="p-4 pt-0 space-y-3 border-t border-purple-500/20">
                  {/* Owner Info */}
                  <div className="flex items-center gap-2 text-sm pt-3">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-purple-300">{store.owner_name}</span>
                  </div>

                  {/* Account Manager */}
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-purple-300">
                      {store.account_manager_name || <span className="text-purple-500">غير معين</span>}
                    </span>
                  </div>

                  {/* Contact Info */}
                  {store.owner_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-purple-300" dir="ltr">{store.owner_phone}</span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-purple-300 mb-1">
                      <span>نسبة الإنجاز</span>
                      <span>{store.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-purple-950/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${store.completion_percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-purple-400 mt-1">
                      {store.completed_tasks} / {store.total_tasks} مهمة
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-purple-900/20 border-t border-purple-500/20 flex justify-between items-center">
                  <span className="text-xs text-purple-400">
                    {new Date(store.created_at).toLocaleDateString('ar-SA')}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/store/${store.store_url}`}
                      className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all"
                      title="عرض التفاصيل"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    {canAddStore && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(store); }}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="تعديل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* أزرار تغيير الحالة */}
                        {(store.status === 'new' || store.status === 'active' || !store.status) && (
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === store.id ? null : store.id); }}
                              className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-all"
                              title="تعديل الاشتراك"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            {showStatusMenu === store.id && (
                              <div className="absolute left-0 bottom-full mb-1 bg-[#1a0a2e] border border-purple-500/30 rounded-xl shadow-xl z-[100] min-w-[140px]">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(store.id, 'paused'); }}
                                  className="w-full px-4 py-2 text-right text-sm text-orange-400 hover:bg-orange-500/10 rounded-t-xl flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  إيقاف مؤقت
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(store.id, 'expired'); }}
                                  className="w-full px-4 py-2 text-right text-sm text-red-400 hover:bg-red-500/10 rounded-b-xl flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                  إيقاف نهائي
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {(store.status === 'paused' || store.status === 'expired') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(store.id, 'active'); }}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all"
                            title="استئناف الاشتراك"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openDeleteModal(store.id, store.store_name); }}
                          disabled={deletingStore === store.id}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                          title="حذف"
                        >
                          {deletingStore === store.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {stores.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-purple-500/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-purple-300/60 text-lg">لا توجد متاجر بعد</p>
            {canAddStore && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl transition-all font-medium"
              >
                إضافة أول متجر
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Store Modal */}
      <AddStoreModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingStore(null); }}
        onSuccess={handleStoreSuccess}
        editingStore={editingStore}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteStore}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف متجر "${storeToDelete?.name}"؟\nسيتم حذف جميع بيانات المتجر بشكل نهائي.`}
        type="confirm"
        confirmText="حذف"
        cancelText="إلغاء"
      />

      {/* Floating Add Store Button */}
      <button
        onClick={() => {
          setEditingStore(null);
          setShowAddModal(true);
        }}
        className="fixed bottom-24 md:bottom-8 left-4 md:left-8 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl shadow-lg shadow-purple-500/30 transition-all font-medium hover:scale-105"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">إضافة متجر</span>
      </button>

      {/* Result Modal */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title={resultModalType === 'success' ? 'نجاح' : 'خطأ'}
        message={resultModalMessage}
        type={resultModalType}
      />

    </div>
  );
}

export default function StoresPage() {
  return (
    <AdminAuth>
      <StoresPageContent />
    </AdminAuth>
  );
}
