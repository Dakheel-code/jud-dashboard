'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TasksByCategory } from '@/types';
import AdminAuth from '@/components/AdminAuth';

interface StoreFullData {
  id: string;
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  notes: string;
  created_at: string;
  subscription_start_date?: string;
  priority?: string;
  status?: string;
  snapchat_account?: string;
  tiktok_account?: string;
  google_account?: string;
  meta_account?: string;
  client_id?: string;
  account_manager?: {
    id: string;
    name: string;
  };
  media_buyer?: {
    id: string;
    name: string;
  };
}

interface StoreMetadata {
  name: string;
  logo: string | null;
}

interface Stats {
  total: number;
  completed: number;
  percentage: number;
}

// دالة لحساب الوقت النسبي
const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'منذ لحظات';
  if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
  if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
  if (diffInSeconds < 2592000) return `منذ ${Math.floor(diffInSeconds / 604800)} أسبوع`;
  if (diffInSeconds < 31536000) return `منذ ${Math.floor(diffInSeconds / 2592000)} شهر`;
  return `منذ ${Math.floor(diffInSeconds / 31536000)} سنة`;
};

function StoreDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const paramId = decodeURIComponent(params.id as string);

  const [storeData, setStoreData] = useState<StoreFullData | null>(null);
  const [storeMetadata, setStoreMetadata] = useState<StoreMetadata | null>(null);
  const [tasks, setTasks] = useState<TasksByCategory>({});
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'info'>('tasks');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string> | null>(null);
  const [isTasksListCollapsed, setIsTasksListCollapsed] = useState(true);
  const [isCampaignsCollapsed, setIsCampaignsCollapsed] = useState(false);
  const [campaignDateRange, setCampaignDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [showPlatformTokenModal, setShowPlatformTokenModal] = useState<string | null>(null);
  const [platformTokenForm, setPlatformTokenForm] = useState({ accessToken: '', accountId: '' });
  const [platformTokens, setPlatformTokens] = useState<{[key: string]: { accessToken: string; accountId: string; connectedAt: string }}>({});
  const [savingPlatformToken, setSavingPlatformToken] = useState(false);
  const [campaignData, setCampaignData] = useState<{ sales: number; revenue: number; spend: number; roas: number } | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [showManualCampaignModal, setShowManualCampaignModal] = useState(false);
  const [manualCampaignForm, setManualCampaignForm] = useState({ sales: '', revenue: '', spend: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    store_name: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    notes: '',
    priority: 'medium',
    status: 'new',
    subscription_start_date: '',
    snapchat_account: '',
    tiktok_account: '',
    google_account: '',
    meta_account: '',
    media_buyer_id: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [mediaBuyers, setMediaBuyers] = useState<{id: string; name: string}[]>([]);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [adAccountsList, setAdAccountsList] = useState<string[]>([]);
  const [editingAdAccounts, setEditingAdAccounts] = useState(false);
  const [adAccountsExpanded, setAdAccountsExpanded] = useState(false);
  const [showDailyUpdateModal, setShowDailyUpdateModal] = useState(false);
  const [dailyUpdateForm, setDailyUpdateForm] = useState({
    sales: '',
    revenue: '',
    spend: ''
  });
  const [dailyUpdateTemplate, setDailyUpdateTemplate] = useState('');

  // جلب قائمة الميديا باير
  useEffect(() => {
    const fetchMediaBuyers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        const buyers = (data.users || []).filter((user: any) => 
          user.roles?.includes('media_buyer') || user.role === 'media_buyer'
        );
        setMediaBuyers(buyers.map((u: any) => ({ id: u.id, name: u.name })));
      } catch (err) {
        console.error('Failed to fetch media buyers:', err);
      }
    };
    fetchMediaBuyers();
  }, []);

  // جلب قالب رسالة التحديث اليومي
  useEffect(() => {
    const fetchDailyUpdateTemplate = async () => {
      const defaultTemplate = 'مرحباً {store_name}،\n\nالتحديث اليومي:\n📊 المبيعات: {sales}\n💰 العائد: {revenue}\n💸 الصرف: {spend}\n\nشكراً لتعاونكم';
      try {
        const response = await fetch('/api/admin/settings/whatsapp-templates');
        const data = await response.json();
        
        if (data.templates) {
          // البحث عن قالب مرتبط بـ daily_update
          const linkedTemplate = Object.values(data.templates).find(
            (t: any) => t.linkedButton === 'daily_update'
          ) as any;
          
          if (linkedTemplate?.content) {
            setDailyUpdateTemplate(linkedTemplate.content);
            return;
          }
          
          // البحث عن قالب باسم daily_update
          if (data.templates.daily_update?.content) {
            setDailyUpdateTemplate(data.templates.daily_update.content);
            return;
          }
          
          // إذا لم يوجد، استخدم أول قالب متاح
          const templateKeys = Object.keys(data.templates);
          if (templateKeys.length > 0) {
            const firstTemplate = data.templates[templateKeys[0]];
            if (firstTemplate?.content) {
              setDailyUpdateTemplate(firstTemplate.content);
              return;
            }
          }
        }
        
        setDailyUpdateTemplate(defaultTemplate);
      } catch (err) {
        setDailyUpdateTemplate(defaultTemplate);
      }
    };
    fetchDailyUpdateTemplate();
  }, []);

  const sendWhatsAppMessage = () => {
    if (!storeData?.owner_phone) {
      alert('لا يوجد رقم هاتف للتاجر');
      return;
    }
    
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = new Date();
    const dayName = days[today.getDay()];
    const dateStr = today.toLocaleDateString('en-US');
    
    let message = dailyUpdateTemplate
      .replace('{store_name}', storeData?.store_name || '')
      .replace('{owner_name}', storeData?.owner_name || '')
      .replace('{account_manager}', storeData?.account_manager?.name || '')
      .replace('{sales}', dailyUpdateForm.sales || '0')
      .replace('{revenue}', dailyUpdateForm.revenue || '0')
      .replace('{spend}', dailyUpdateForm.spend || '0')
      .replace('{day}', dayName)
      .replace('{date}', dateStr)
      .replace('{store_url}', storeData?.store_url || '');
    
    const phone = storeData.owner_phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowDailyUpdateModal(false);
    setDailyUpdateForm({ sales: '', revenue: '', spend: '' });
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev || []);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // تهيئة الأقسام المطوية عند جلب المهام
  useEffect(() => {
    if (Object.keys(tasks).length > 0 && collapsedCategories === null) {
      // جعل جميع الأقسام مطوية بشكل افتراضي
      setCollapsedCategories(new Set(Object.keys(tasks)));
    }
  }, [tasks, collapsedCategories]);

  useEffect(() => {
    if (paramId) {
      fetchStoreData();
    }
    fetchAdAccountsList();
  }, [paramId]);

  const fetchAdAccountsList = async () => {
    try {
      const response = await fetch('/api/admin/ad-accounts');
      const data = await response.json();
      if (data.accounts && Array.isArray(data.accounts)) {
        setAdAccountsList(data.accounts);
      }
    } catch (err) {
      console.error('Error fetching ad accounts:', err);
    }
  };

  const fetchPlatformTokens = async () => {
    if (!storeId) return;
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/platform-tokens`);
      const data = await response.json();
      if (data.tokens) {
        setPlatformTokens(data.tokens);
      }
    } catch (err) {
      console.error('Error fetching platform tokens:', err);
    }
  };

  const savePlatformToken = async () => {
    if (!storeId || !showPlatformTokenModal) return;
    setSavingPlatformToken(true);
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/platform-tokens`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: showPlatformTokenModal,
          accessToken: platformTokenForm.accessToken,
          accountId: platformTokenForm.accountId
        })
      });
      const data = await response.json();
      if (data.success) {
        setPlatformTokens(prev => ({
          ...prev,
          [showPlatformTokenModal]: {
            accessToken: platformTokenForm.accessToken,
            accountId: platformTokenForm.accountId,
            connectedAt: new Date().toISOString()
          }
        }));
        setShowPlatformTokenModal(null);
        setPlatformTokenForm({ accessToken: '', accountId: '' });
      }
    } catch (err) {
      console.error('Error saving platform token:', err);
    } finally {
      setSavingPlatformToken(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchPlatformTokens();
    }
  }, [storeId]);

  const fetchCampaignData = async () => {
    if (!storeId) return;
    setLoadingCampaigns(true);
    setCampaignError(null);
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/campaigns?range=${campaignDateRange}`);
      const data = await response.json();
      if (data.error) {
        setCampaignError(data.error);
      }
      if (data.summary) {
        setCampaignData(data.summary);
      }
      // عرض تفاصيل الخطأ من Snapchat إن وجد
      if (data.snapchat?.error) {
        setCampaignError(data.snapchat.error);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setCampaignError('فشل في جلب بيانات الحملات');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    if (storeId && Object.keys(platformTokens).length > 0) {
      fetchCampaignData();
    }
  }, [storeId, platformTokens, campaignDateRange]);

  const disconnectPlatform = async (platform: string) => {
    if (!storeId || !confirm('هل أنت متأكد من إلغاء ربط هذه المنصة؟')) return;
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/platform-tokens`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      });
      if (response.ok) {
        setPlatformTokens(prev => {
          const newTokens = { ...prev };
          delete newTokens[platform];
          return newTokens;
        });
      }
    } catch (err) {
      console.error('Error disconnecting platform:', err);
    }
  };

  const fetchStoreData = async () => {
    try {
      // التحقق إذا كان المعرف هو UUID أو store_url
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
      
      let response;
      if (isUUID) {
        // جلب بيانات المتجر بالـ ID أولاً
        const storeResponse = await fetch(`/api/admin/stores/${paramId}`);
        const storeResult = await storeResponse.json();
        
        if (storeResponse.ok && storeResult.store) {
          const storeUrl = storeResult.store.store_url;
          response = await fetch(`/api/tasks?store_url=${encodeURIComponent(storeUrl)}`);
        } else {
          setLoading(false);
          return;
        }
      } else {
        response = await fetch(`/api/tasks?store_url=${encodeURIComponent(paramId)}`);
      }
      
      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks || {});
        setStats(data.stats || { total: 0, completed: 0, percentage: 0 });
        setStoreId(data.store_id);
        setStoreData(data.store);
        
        // جلب معلومات المتجر (الشعار والاسم)
        if (data.store_url) {
          const metaResponse = await fetch(`/api/store/metadata?url=${encodeURIComponent(data.store_url)}`);
          const metaData = await metaResponse.json();
          setStoreMetadata({
            name: metaData.name || data.store_url,
            logo: metaData.logo,
          });
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch store data:', err);
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    if (!storeId) return;
    
    setTogglingTask(taskId);
    try {
      const response = await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, task_id: taskId }),
      });

      if (response.ok) {
        // تحديث حالة المهمة محلياً
        setTasks(prevTasks => {
          const newTasks = { ...prevTasks };
          for (const category in newTasks) {
            newTasks[category] = newTasks[category].map(task =>
              task.id === taskId ? { ...task, is_done: !currentStatus } : task
            );
          }
          return newTasks;
        });

        // تحديث الإحصائيات
        setStats(prev => {
          const newCompleted = currentStatus ? prev.completed - 1 : prev.completed + 1;
          return {
            ...prev,
            completed: newCompleted,
            percentage: Math.round((newCompleted / prev.total) * 100)
          };
        });
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    } finally {
      setTogglingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
          </div>
          <div className="text-xl text-white font-semibold">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  const getCategoryStats = (categoryTasks: any[]) => {
    const completed = categoryTasks.filter(t => t.is_done).length;
    return { completed, total: categoryTasks.length };
  };

  const openEditModal = () => {
    if (storeData) {
      setEditForm({
        store_name: storeData.store_name || '',
        owner_name: storeData.owner_name || '',
        owner_phone: storeData.owner_phone || '',
        owner_email: storeData.owner_email || '',
        notes: storeData.notes || '',
        priority: storeData.priority || 'medium',
        status: storeData.status || 'new',
        subscription_start_date: storeData.subscription_start_date || '',
        snapchat_account: storeData.snapchat_account || '',
        tiktok_account: storeData.tiktok_account || '',
        google_account: storeData.google_account || '',
        meta_account: storeData.meta_account || '',
        media_buyer_id: storeData.media_buyer?.id || ''
      });
      setShowEditModal(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;

    setEditLoading(true);
    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        // تحديث البيانات المحلية
        setStoreData(prev => prev ? { ...prev, ...editForm } : null);
        setShowEditModal(false);
      }
    } catch (err) {
      console.error('Failed to update store:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!storeId) return;

    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setStoreData(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAdAccountChange = async (field: string, value: string) => {
    if (!storeId) return;

    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value || null })
      });

      if (response.ok) {
        setStoreData(prev => prev ? { ...prev, [field]: value || undefined } : null);
      }
    } catch (err) {
      console.error('Failed to update ad account:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            {storeMetadata?.logo && (
              <img 
                src={storeMetadata.logo} 
                alt={storeMetadata.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                {storeMetadata?.name || storeData?.store_name || 'تفاصيل المتجر'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-purple-300/70 text-sm">{storeData?.store_url}</p>
                <a 
                  href={`https://${storeData?.store_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400/50 hover:text-purple-300 transition-colors"
                  title="فتح المتجر"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* زر التحكم بالاشتراك مع قائمة منسدلة */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`p-3 border rounded-xl transition-all ${
                  storeData?.status === 'active' ? 'text-green-400 border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10' :
                  storeData?.status === 'paused' ? 'text-orange-400 border-orange-500/30 hover:border-orange-400/50 hover:bg-orange-500/10' :
                  storeData?.status === 'expired' ? 'text-red-400 border-red-500/30 hover:border-red-400/50 hover:bg-red-500/10' :
                  'text-blue-400 border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10'
                }`}
                title="التحكم بالاشتراك"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                  <div className="absolute left-0 top-full mt-2 w-48 bg-[#1a0a2e] border border-purple-500/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <button
                      onClick={() => { handleStatusChange('active'); setShowStatusMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${storeData?.status === 'active' ? 'bg-green-500/20 text-green-400' : 'text-purple-300 hover:bg-purple-500/10'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      نشط
                    </button>
                    <button
                      onClick={() => { handleStatusChange('paused'); setShowStatusMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${storeData?.status === 'paused' ? 'bg-orange-500/20 text-orange-400' : 'text-purple-300 hover:bg-purple-500/10'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      إيقاف مؤقت
                    </button>
                    <button
                      onClick={() => { handleStatusChange('expired'); setShowStatusMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${storeData?.status === 'expired' ? 'bg-red-500/20 text-red-400' : 'text-purple-300 hover:bg-purple-500/10'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      منتهي
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowDailyUpdateModal(true)}
              className="p-3 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-xl transition-all"
              title="التحديث اليومي"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              onClick={openEditModal}
              className="p-3 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-xl transition-all"
              title="تعديل بيانات المتجر"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <Link
              href="/admin/stores"
              className="p-3 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all"
              title="العودة لصفحة المتاجر"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Store Info Card */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 mb-6 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-purple-500/20 rtl:divide-x-reverse">
            {/* نسبة الإنجاز */}
            <div className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{stats.percentage}%</span>
              </div>
              <p className="text-xs text-purple-300/70">نسبة الإنجاز</p>
              <p className="text-sm text-white font-medium">{stats.completed}/{stats.total}</p>
            </div>
            
            {/* مدير الحساب */}
            <div className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-xs text-purple-300/70">مدير الحساب</p>
              {storeData?.account_manager ? (
                <Link href={`/admin/users/${storeData.account_manager.id}`} className="text-sm text-white font-medium hover:text-fuchsia-400 transition-colors">
                  {storeData.account_manager.name.split(' ')[0]}
                </Link>
              ) : (
                <p className="text-sm text-purple-400">غير محدد</p>
              )}
            </div>
            
            {/* ميديا باير */}
            <div className="p-4 text-center border-l border-purple-500/20">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <p className="text-xs text-purple-300/70">ميديا باير</p>
              {storeData?.media_buyer ? (
                <Link href={`/admin/users/${storeData.media_buyer.id}`} className="text-sm text-white font-medium hover:text-cyan-400 transition-colors">
                  {storeData.media_buyer.name.split(' ')[0]}
                </Link>
              ) : (
                <p className="text-sm text-purple-400">غير محدد</p>
              )}
            </div>
            
            {/* صاحب المتجر */}
            <div className="p-4 text-center border-l border-purple-500/20">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-xs text-purple-300/70">صاحب المتجر</p>
              {storeData?.client_id ? (
                <Link 
                  href={`/admin/clients?view=${storeData.client_id}`}
                  className="text-sm text-white font-medium hover:text-purple-300 transition-colors cursor-pointer"
                >
                  {storeData?.owner_name || '-'}
                </Link>
              ) : (
                <p className="text-sm text-white font-medium">{storeData?.owner_name || '-'}</p>
              )}
            </div>
          </div>
          
          {/* بيانات الاشتراك */}
          <div className="border-t border-purple-500/20 p-4">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${storeData?.subscription_start_date ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-sm text-purple-300">
                  {storeData?.subscription_start_date ? 'الاشتراك فعال' : 'في انتظار إطلاق الحملات'}
                </span>
              </div>
              {storeData?.subscription_start_date && (
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-purple-300">بداية الاشتراك:</span>
                  <span className="text-white font-medium">
                    {new Date(storeData.subscription_start_date).toLocaleDateString('en-US')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* الحسابات الإعلانية */}
          <div className="border-t border-purple-500/20">
            <button
              onClick={() => setAdAccountsExpanded(!adAccountsExpanded)}
              className="w-full p-4 flex items-center justify-center gap-2 hover:bg-purple-500/5 transition-colors"
            >
              <p className="text-xs text-purple-300/70">الحسابات الإعلانية</p>
              <svg 
                className={`w-4 h-4 text-purple-400 transition-transform ${adAccountsExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {adAccountsExpanded && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <button
                    onClick={() => setEditingAdAccounts(!editingAdAccounts)}
                    className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-all"
                    title={editingAdAccounts ? 'حفظ' : 'تعديل'}
                  >
                    {editingAdAccounts ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4">
              {/* Meta */}
              <div className="flex flex-col items-center gap-1">
                <div className={`p-3 rounded-xl transition-all ${storeData?.meta_account ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-purple-900/20 border border-purple-500/20'}`}>
                  <svg className={`w-6 h-6 ${storeData?.meta_account ? 'text-indigo-400' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
                  </svg>
                </div>
                {editingAdAccounts ? (
                  <select
                    value={storeData?.meta_account || ''}
                    onChange={e => handleAdAccountChange('meta_account', e.target.value)}
                    className="w-32 px-2 py-1 bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs rounded-lg focus:ring-1 focus:ring-purple-500 outline-none [&>option]:bg-[#1a0a2e] [&>option]:text-purple-300"
                  >
                    <option value="">لا يوجد</option>
                    {adAccountsList.map((email, idx) => (
                      <option key={idx} value={email}>{email}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-purple-300 truncate max-w-[120px]" title={storeData?.meta_account || 'لا يوجد'}>
                    {storeData?.meta_account || 'لا يوجد'}
                  </span>
                )}
              </div>

              {/* Google */}
              <div className="flex flex-col items-center gap-1">
                <div className={`p-3 rounded-xl transition-all ${storeData?.google_account ? 'bg-green-500/10 border border-green-500/30' : 'bg-purple-900/20 border border-purple-500/20'}`}>
                  <svg className={`w-6 h-6 ${storeData?.google_account ? 'text-green-400' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                {editingAdAccounts ? (
                  <select
                    value={storeData?.google_account || ''}
                    onChange={e => handleAdAccountChange('google_account', e.target.value)}
                    className="w-32 px-2 py-1 bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs rounded-lg focus:ring-1 focus:ring-purple-500 outline-none [&>option]:bg-[#1a0a2e] [&>option]:text-purple-300"
                  >
                    <option value="">لا يوجد</option>
                    {adAccountsList.map((email, idx) => (
                      <option key={idx} value={email}>{email}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-purple-300 truncate max-w-[120px]" title={storeData?.google_account || 'لا يوجد'}>
                    {storeData?.google_account || 'لا يوجد'}
                  </span>
                )}
              </div>

              {/* TikTok */}
              <div className="flex flex-col items-center gap-1">
                <div className={`p-3 rounded-xl transition-all ${storeData?.tiktok_account ? 'bg-white/10 border border-white/30' : 'bg-purple-900/20 border border-purple-500/20'}`}>
                  <svg className={`w-6 h-6 ${storeData?.tiktok_account ? 'text-white' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
                {editingAdAccounts ? (
                  <select
                    value={storeData?.tiktok_account || ''}
                    onChange={e => handleAdAccountChange('tiktok_account', e.target.value)}
                    className="w-32 px-2 py-1 bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs rounded-lg focus:ring-1 focus:ring-purple-500 outline-none [&>option]:bg-[#1a0a2e] [&>option]:text-purple-300"
                  >
                    <option value="">لا يوجد</option>
                    {adAccountsList.map((email, idx) => (
                      <option key={idx} value={email}>{email}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-purple-300 truncate max-w-[120px]" title={storeData?.tiktok_account || 'لا يوجد'}>
                    {storeData?.tiktok_account || 'لا يوجد'}
                  </span>
                )}
              </div>

              {/* Snapchat */}
              <div className="flex flex-col items-center gap-1">
                <div className={`p-3 rounded-xl transition-all ${storeData?.snapchat_account ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-purple-900/20 border border-purple-500/20'}`}>
                  <svg className={`w-6 h-6 ${storeData?.snapchat_account ? 'text-yellow-400' : 'text-gray-500'}`} viewBox="0 0 512 512" fill="currentColor">
                    <path d="M496.926,366.6c-3.373-9.176-9.8-14.086-17.112-18.153-1.376-.806-2.641-1.451-3.72-1.947-2.182-1.128-4.414-2.22-6.634-3.373-22.8-12.09-40.609-27.341-52.959-45.42a102.889,102.889,0,0,1-9.089-16.269c-1.054-2.766-.992-4.377-.065-5.954a11.249,11.249,0,0,1,3.088-2.818c2.766-1.8,5.669-3.373,8.2-4.7,4.7-2.5,8.5-4.5,10.9-5.954,7.287-4.477,12.5-9.4,15.5-14.629a24.166,24.166,0,0,0,1.863-22.031c-4.328-12.266-17.9-19.263-28.263-19.263a35.007,35.007,0,0,0-9.834,1.376c-.124.037-.236.074-.347.111,0-1.451.024-2.915.024-4.377,0-22.92-2.508-46.152-10.9-67.615C378.538,91.727,341.063,56.7,286.741,50.6a118.907,118.907,0,0,0-12.293-.621h-36.9a118.907,118.907,0,0,0-12.293.621c-54.31,6.1-91.785,41.127-110.839,84.168-8.4,21.463-10.9,44.7-10.9,67.615,0,1.462.012,2.926.024,4.377-.111-.037-.223-.074-.347-.111a35.007,35.007,0,0,0-9.834-1.376c-10.362,0-23.935,7-28.263,19.263a24.166,24.166,0,0,0,1.863,22.031c3,5.233,8.213,10.152,15.5,14.629,2.4,1.451,6.2,3.46,10.9,5.954,2.52,1.327,5.418,2.9,8.181,4.7a11.3,11.3,0,0,1,3.088,2.818c.927,1.576.989,3.187-.065,5.954a102.889,102.889,0,0,1-9.089,16.269c-12.35,18.079-30.161,33.33-52.959,45.42-2.22,1.153-4.452,2.245-6.634,3.373-1.079.5-2.344,1.141-3.72,1.947-7.312,4.067-13.739,8.977-17.112,18.153-3.6,9.834-1.044,20.882,7.6,32.838,8.7,12.017,20.018,18.4,33.787,19.016,4.278.2,8.7-.161,13.168-.533,3.9-.322,7.9-.657,11.778-.657a53.666,53.666,0,0,1,9.725.806,51.1,51.1,0,0,1,3.249.818c.682,1.054,1.376,2.182,2.108,3.4,4.7,7.823,11.168,18.54,24.077,29.2,13.8,11.4,32.018,21.041,57.271,28.489a12.478,12.478,0,0,1,3.633,1.54,11.5,11.5,0,0,1,1.985,1.985c3.088,4.278,8.083,7.947,15.259,11.242,8.362,3.844,18.8,6.746,31.1,8.635a245.762,245.762,0,0,0,37.238,2.817c12.8,0,25.371-.918,37.238-2.817,12.3-1.889,22.738-4.791,31.1-8.635,7.176-3.3,12.171-6.964,15.259-11.242a11.5,11.5,0,0,1,1.985-1.985,12.478,12.478,0,0,1,3.633-1.54c25.253-7.448,43.469-17.087,57.271-28.489,12.909-10.659,19.375-21.376,24.077-29.2.732-1.215,1.426-2.344,2.108-3.4a51.1,51.1,0,0,1,3.249-.818,53.666,53.666,0,0,1,9.725-.806c3.881,0,7.873.335,11.778.657,4.464.372,8.89.732,13.168.533,13.769-.62,25.091-7,33.787-19.016C497.97,387.482,500.522,376.434,496.926,366.6Z"/>
                  </svg>
                </div>
                {editingAdAccounts ? (
                  <select
                    value={storeData?.snapchat_account || ''}
                    onChange={e => handleAdAccountChange('snapchat_account', e.target.value)}
                    className="w-32 px-2 py-1 bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs rounded-lg focus:ring-1 focus:ring-purple-500 outline-none [&>option]:bg-[#1a0a2e] [&>option]:text-purple-300"
                  >
                    <option value="">لا يوجد</option>
                    {adAccountsList.map((email, idx) => (
                      <option key={idx} value={email}>{email}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-purple-300 truncate max-w-[120px]" title={storeData?.snapchat_account || 'لا يوجد'}>
                    {storeData?.snapchat_account || 'لا يوجد'}
                  </span>
                )}
              </div>
            </div>
              </div>
            )}
          </div>
          
          {/* معلومات التواصل */}
          {(storeData?.owner_phone || storeData?.owner_email) && (
            <div className="border-t border-purple-500/20 p-4">
              <div className="flex flex-wrap gap-4 justify-center">
                {storeData?.owner_phone && (
                  <>
                    <a href={`tel:${storeData.owner_phone}`} className="flex items-center gap-2 text-sm text-purple-300 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {storeData.owner_phone}
                    </a>
                    <a 
                      href={`https://wa.me/${storeData.owner_phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      واتساب
                    </a>
                  </>
                )}
                {storeData?.owner_email && (
                  <a href={`mailto:${storeData.owner_email}`} className="flex items-center gap-2 text-sm text-purple-300 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {storeData.owner_email}
                  </a>
                )}
                {storeData?.created_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-purple-300">تاريخ الإنشاء:</span>
                    <span className="text-white font-medium">
                      {new Date(storeData.created_at).toLocaleDateString('en-US')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* ملاحظات */}
          {storeData?.notes && (
            <div className="border-t border-purple-500/20 p-4">
              <p className="text-xs text-purple-300/70 mb-1">ملاحظات</p>
              <p className="text-sm text-white">{storeData.notes}</p>
            </div>
          )}

          </div>

        {/* Progress Bar */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-300">التقدم الكلي</span>
            <span className="text-sm font-bold text-white">{stats.percentage}%</span>
          </div>
          <div className="h-3 bg-purple-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* قائمة المهام - مربع قابل للطي */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden mb-6">
          {/* Header - قابل للنقر */}
          <button
            onClick={() => setIsTasksListCollapsed(!isTasksListCollapsed)}
            className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">قائمة المهام</h2>
              <span className="text-sm text-purple-400">({stats.completed}/{stats.total})</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className={`w-5 h-5 text-purple-400 transition-transform ${isTasksListCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* محتوى قائمة المهام */}
          {!isTasksListCollapsed && (
            <div className="p-4 pt-0 space-y-4">
              {Object.entries(tasks).map(([category, categoryTasks]) => {
            const catStats = getCategoryStats(categoryTasks);
            const isCollapsed = collapsedCategories?.has(category) ?? true;
            return (
              <div key={category} className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
                {/* Category Header - Clickable */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      catStats.completed === catStats.total 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {catStats.completed === catStats.total ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white">{category}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${
                      catStats.completed === catStats.total ? 'text-green-400' : 'text-purple-300'
                    }`}>
                      {catStats.completed}/{catStats.total}
                    </span>
                    {catStats.completed === catStats.total && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">مكتمل</span>
                    )}
                    <svg 
                      className={`w-5 h-5 text-purple-400 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Tasks List - Collapsible */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[2000px]'}`}>
                  <div className="divide-y divide-purple-500/10 border-t border-purple-500/20">
                    {categoryTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-4 p-4 transition-all hover:bg-purple-500/5 ${
                          task.is_done ? 'bg-green-500/5' : ''
                        }`}
                      >
                        {/* Toggle Button */}
                        <button
                          onClick={() => handleToggleTask(task.id, task.is_done)}
                          disabled={togglingTask === task.id}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            task.is_done
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-purple-500/50 hover:border-purple-400'
                          } ${togglingTask === task.id ? 'opacity-50' : ''}`}
                        >
                          {togglingTask === task.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : task.is_done ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </button>

                        {/* Task Title */}
                        <span className={`flex-1 ${task.is_done ? 'text-purple-400 line-through' : 'text-white'}`}>
                          {task.title}
                        </span>

                        {/* Status Badge */}
                        <button
                          onClick={() => handleToggleTask(task.id, task.is_done)}
                          disabled={togglingTask === task.id}
                          className={`p-2 sm:px-3 sm:py-1 rounded-lg text-xs font-medium transition-all ${
                            task.is_done
                              ? 'text-green-400 border border-green-500/30 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400'
                              : 'text-purple-300 border border-purple-500/30 hover:border-green-400/50 hover:bg-green-500/10 hover:text-green-400'
                          }`}
                          title={task.is_done ? 'إلغاء الإنجاز' : 'تحديد كمنجز'}
                        >
                          <span className="hidden sm:inline">{task.is_done ? 'إلغاء الإنجاز' : 'تحديد كمنجز'}</span>
                          <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {task.is_done ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            )}
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
              })}
            </div>
          )}
        </div>

        {/* قسم الحملات الإعلانية */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
          {/* Header - قابل للنقر */}
          <button
            onClick={() => setIsCampaignsCollapsed(!isCampaignsCollapsed)}
            className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">الحملات الإعلانية</h2>
            </div>
            <div className="flex items-center gap-2">
              <svg className={`w-5 h-5 text-purple-400 transition-transform ${isCampaignsCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* محتوى الحملات */}
          {!isCampaignsCollapsed && (
            <div className="p-4 pt-0 space-y-4">
              {/* زر إدخال البيانات يدوياً */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowManualCampaignModal(true)}
                  className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/50 text-purple-300 rounded-lg text-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  إدخال بيانات الحملات
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">المبيعات</p>
                  <p className="text-2xl font-bold text-white">{campaignData ? campaignData.sales.toLocaleString() : '--'}</p>
                  <p className="text-xs text-green-400/70">طلب</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
                  <p className="text-xs text-blue-400 mb-1">العائد</p>
                  <p className="text-2xl font-bold text-white">{campaignData ? campaignData.revenue.toLocaleString('ar-SA', { maximumFractionDigits: 0 }) : '--'}</p>
                  <p className="text-xs text-blue-400/70">ر.س</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/20">
                  <p className="text-xs text-orange-400 mb-1">الصرف</p>
                  <p className="text-2xl font-bold text-white">{campaignData ? campaignData.spend.toLocaleString('ar-SA', { maximumFractionDigits: 0 }) : '--'}</p>
                  <p className="text-xs text-orange-400/70">ر.س</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-1">ROAS</p>
                  <p className="text-2xl font-bold text-white">{campaignData ? campaignData.roas.toFixed(2) : '--'}</p>
                  <p className="text-xs text-purple-400/70">x</p>
                </div>
              </div>

              {/* المنصات */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-purple-300">ربط المنصات الإعلانية (API)</h3>
                
                {[
                  { key: 'snapchat', name: 'Snapchat', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
                  { key: 'tiktok', name: 'TikTok', bgColor: 'bg-pink-500/20', textColor: 'text-pink-400' },
                  { key: 'meta', name: 'Meta (Facebook/Instagram)', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
                  { key: 'google', name: 'Google Ads', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
                ].map(platform => {
                  const isConnected = !!platformTokens[platform.key];
                  return (
                    <div key={platform.key} className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${platform.bgColor} flex items-center justify-center`}>
                            <span className={`text-lg font-bold ${platform.textColor}`}>{platform.name[0]}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{platform.name}</p>
                            <p className="text-xs text-purple-400">
                              {isConnected ? `Account: ${platformTokens[platform.key].accountId}` : 'غير مرتبط'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isConnected ? (
                            <>
                              <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">مرتبط</span>
                              <button
                                onClick={() => disconnectPlatform(platform.key)}
                                className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setShowPlatformTokenModal(platform.key);
                                setPlatformTokenForm({ accessToken: '', accountId: '' });
                              }}
                              className="px-4 py-1.5 rounded-lg text-xs bg-purple-500/30 text-purple-300 hover:bg-purple-500/50 transition-colors"
                            >
                              ربط
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نافذة إدخال Access Token للمنصة */}
      {showPlatformTokenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPlatformTokenModal(null)}>
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                ربط {showPlatformTokenModal === 'snapchat' ? 'Snapchat' : 
                     showPlatformTokenModal === 'tiktok' ? 'TikTok' : 
                     showPlatformTokenModal === 'meta' ? 'Meta' : 'Google Ads'}
              </h3>
              <button
                onClick={() => setShowPlatformTokenModal(null)}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-purple-300 mb-2">Account ID / Ad Account ID</label>
                <input
                  type="text"
                  value={platformTokenForm.accountId}
                  onChange={e => setPlatformTokenForm(prev => ({ ...prev, accountId: e.target.value }))}
                  placeholder="أدخل معرف الحساب الإعلاني"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">Access Token</label>
                <textarea
                  value={platformTokenForm.accessToken}
                  onChange={e => setPlatformTokenForm(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="أدخل Access Token من المنصة"
                  rows={4}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none resize-none font-mono text-xs"
                  dir="ltr"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-xs text-blue-300">
                  للحصول على Access Token، قم بزيارة لوحة تحكم المطورين للمنصة المعنية وأنشئ تطبيق Marketing API.
                </p>
              </div>

              <button
                onClick={savePlatformToken}
                disabled={savingPlatformToken || !platformTokenForm.accessToken || !platformTokenForm.accountId}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-medium hover:from-purple-500 hover:to-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPlatformToken ? 'جاري الحفظ...' : 'حفظ وربط'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إدخال بيانات الحملات يدوياً */}
      {showManualCampaignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowManualCampaignModal(false)}>
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">إدخال بيانات الحملات</h3>
              <button
                onClick={() => setShowManualCampaignModal(false)}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-purple-400 mb-4">أدخل الأرقام من لوحة تحكم المنصات الإعلانية</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-purple-300 mb-2">المبيعات (عدد الطلبات)</label>
                <input
                  type="number"
                  value={manualCampaignForm.sales}
                  onChange={e => setManualCampaignForm(prev => ({ ...prev, sales: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">العائد (ر.س)</label>
                <input
                  type="number"
                  value={manualCampaignForm.revenue}
                  onChange={e => setManualCampaignForm(prev => ({ ...prev, revenue: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">الصرف (ر.س)</label>
                <input
                  type="number"
                  value={manualCampaignForm.spend}
                  onChange={e => setManualCampaignForm(prev => ({ ...prev, spend: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              <button
                onClick={() => {
                  const sales = parseFloat(manualCampaignForm.sales) || 0;
                  const revenue = parseFloat(manualCampaignForm.revenue) || 0;
                  const spend = parseFloat(manualCampaignForm.spend) || 0;
                  const roas = spend > 0 ? revenue / spend : 0;
                  setCampaignData({ sales, revenue, spend, roas });
                  setShowManualCampaignModal(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-medium hover:from-purple-500 hover:to-purple-400 transition-all"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Store Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div 
            className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-purple-500/20">
              <h3 className="text-xl font-bold text-white">تعديل بيانات المتجر</h3>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* اسم المتجر */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">اسم المتجر</label>
                <input
                  type="text"
                  value={editForm.store_name}
                  onChange={e => setEditForm(prev => ({ ...prev, store_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              {/* صاحب المتجر */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">صاحب المتجر</label>
                <input
                  type="text"
                  value={editForm.owner_name}
                  onChange={e => setEditForm(prev => ({ ...prev, owner_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              {/* رقم الهاتف والبريد */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-purple-300 mb-2">رقم الهاتف</label>
                  <input
                    type="text"
                    value={editForm.owner_phone}
                    onChange={e => setEditForm(prev => ({ ...prev, owner_phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editForm.owner_email}
                    onChange={e => setEditForm(prev => ({ ...prev, owner_email: e.target.value }))}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              {/* الأولوية والحالة */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-purple-300 mb-2">الأولوية</label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  >
                    <option value="high" className="bg-[#1a0a2e]">مرتفع</option>
                    <option value="medium" className="bg-[#1a0a2e]">متوسط</option>
                    <option value="low" className="bg-[#1a0a2e]">منخفض</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-2">الحالة</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  >
                    <option value="new" className="bg-[#1a0a2e]">جديد</option>
                    <option value="active" className="bg-[#1a0a2e]">نشط</option>
                    <option value="paused" className="bg-[#1a0a2e]">متوقف</option>
                    <option value="expired" className="bg-[#1a0a2e]">منتهي</option>
                  </select>
                </div>
              </div>

              {/* ميديا باير */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">ميديا باير</label>
                <select
                  value={editForm.media_buyer_id}
                  onChange={e => setEditForm(prev => ({ ...prev, media_buyer_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                >
                  <option value="" className="bg-[#1a0a2e]">غير محدد</option>
                  {mediaBuyers.map(buyer => (
                    <option key={buyer.id} value={buyer.id} className="bg-[#1a0a2e]">{buyer.name}</option>
                  ))}
                </select>
              </div>

              {/* تاريخ بداية الاشتراك */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">تاريخ بداية الاشتراك</label>
                <input
                  type="date"
                  value={editForm.subscription_start_date ? editForm.subscription_start_date.split('T')[0] : ''}
                  onChange={e => setEditForm(prev => ({ ...prev, subscription_start_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              {/* ملاحظات */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">ملاحظات</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none resize-none"
                />
              </div>

              {/* أزرار */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-50"
                >
                  {editLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة التحديث اليومي */}
      {showDailyUpdateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">التحديث اليومي</h3>
              <button
                onClick={() => setShowDailyUpdateModal(false)}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* المبيعات */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">المبيعات</label>
                <input
                  type="text"
                  value={dailyUpdateForm.sales}
                  onChange={e => setDailyUpdateForm(prev => ({ ...prev, sales: e.target.value }))}
                  placeholder="أدخل قيمة المبيعات"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              {/* العائد */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">العائد</label>
                <input
                  type="text"
                  value={dailyUpdateForm.revenue}
                  onChange={e => setDailyUpdateForm(prev => ({ ...prev, revenue: e.target.value }))}
                  placeholder="أدخل قيمة العائد"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              {/* الصرف */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">الصرف</label>
                <input
                  type="text"
                  value={dailyUpdateForm.spend}
                  onChange={e => setDailyUpdateForm(prev => ({ ...prev, spend: e.target.value }))}
                  placeholder="أدخل قيمة الصرف"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              {/* زر الإرسال */}
              <button
                onClick={sendWhatsAppMessage}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-medium hover:from-green-500 hover:to-green-400 transition-all flex items-center justify-center gap-2 mt-6"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                إرسال عبر الواتساب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoreDetailsPage() {
  return (
    <AdminAuth>
      <StoreDetailsContent />
    </AdminAuth>
  );
}
