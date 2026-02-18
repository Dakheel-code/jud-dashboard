'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { TasksByCategory } from '@/types';

const SnapchatCampaignsSection = dynamic(() => import('@/components/SnapchatCampaignsSection'), { ssr: false });
const AddStoreModal = dynamic(() => import('@/components/AddStoreModal'), { ssr: false });

interface StoreFullData {
  id: string;
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  store_group_url?: string;
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
  const searchParams = useSearchParams();
  const paramId = decodeURIComponent(params.id as string);

  const [storeData, setStoreData] = useState<StoreFullData | null>(null);
  const [storeMetadata, setStoreMetadata] = useState<StoreMetadata | null>(null);
  const [tasks, setTasks] = useState<TasksByCategory>({});
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [sentWhatsappTasks, setSentWhatsappTasks] = useState<Set<string>>(new Set());
  const [sentWhatsappCategories, setSentWhatsappCategories] = useState<Set<string>>(new Set());
  const [categoryWhatsappMessages, setCategoryWhatsappMessages] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'tasks' | 'info'>('tasks');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string> | null>(null);
  const [isTasksListCollapsed, setIsTasksListCollapsed] = useState(true);
  const [isCampaignsCollapsed, setIsCampaignsCollapsed] = useState(true);
  const [campaignDateRange, setCampaignDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [showPlatformTokenModal, setShowPlatformTokenModal] = useState<string | null>(null);
  const [platformTokenForm, setPlatformTokenForm] = useState({ accessToken: '', accountId: '' });
  const [platformTokens, setPlatformTokens] = useState<{[key: string]: { accessToken: string; accountId: string; connectedAt: string }}>({});
  const [savingPlatformToken, setSavingPlatformToken] = useState(false);
  const [campaignData, setCampaignData] = useState<{ sales: number; revenue: number; spend: number; roas: number; clicks?: number; impressions?: number } | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [showManualCampaignModal, setShowManualCampaignModal] = useState(false);
  const [manualCampaignForm, setManualCampaignForm] = useState({ sales: '', revenue: '', spend: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [adAccountsList, setAdAccountsList] = useState<string[]>([]);
  const [editingAdAccounts, setEditingAdAccounts] = useState(false);
  const [adAccountsExpanded, setAdAccountsExpanded] = useState(false);
  const [showDailyUpdateModal, setShowDailyUpdateModal] = useState(false);
  const [dailyUpdateForm, setDailyUpdateForm] = useState({
    sales: '',
    orders: '',
    roas: '',
    spend: ''
  });
  const [dailyUpdateTemplate, setDailyUpdateTemplate] = useState('');
  const [snapchatSummary, setSnapchatSummary] = useState<{ spend: number; orders: number; sales: number; roas: number } | null>(null);
  // واجهة اختيار هوية Snapchat
  const [showSnapchatIdentityModal, setShowSnapchatIdentityModal] = useState(false);
  const [snapchatIdentities, setSnapchatIdentities] = useState<{identity_key: string; display_name: string | null; last_used_at: string | null}[]>([]);
  const [loadingSnapchatIdentities, setLoadingSnapchatIdentities] = useState(false);
  const [attachingSnapchat, setAttachingSnapchat] = useState(false);
  const [snapchatAdAccountsForAttach, setSnapchatAdAccountsForAttach] = useState<{id: string; name: string}[]>([]);
  const [loadingSnapchatAdAccounts, setLoadingSnapchatAdAccounts] = useState(false);
  const [selectedSnapchatAdAccount, setSelectedSnapchatAdAccount] = useState<string>('');
  const [snapchatAdAccountSearch, setSnapchatAdAccountSearch] = useState<string>('');
  const [showWindsorAccountModal, setShowWindsorAccountModal] = useState<string | null>(null);
  const [windsorAccounts, setWindsorAccounts] = useState<{account_name: string; datasource: string}[]>([]);
  const [loadingWindsorAccounts, setLoadingWindsorAccounts] = useState(false);
  const [selectedWindsorAccount, setSelectedWindsorAccount] = useState<string>('');
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  // حالة الربط المباشر للمنصات
  const [directIntegrations, setDirectIntegrations] = useState<Record<string, {status: string; ad_account_id?: string; ad_account_name?: string}>>({});
  const [platformCampaigns, setPlatformCampaigns] = useState<{[key: string]: any[]}>({});
  const [platformInactiveCampaigns, setPlatformInactiveCampaigns] = useState<{[key: string]: any[]}>({});
  const [platformTotals, setPlatformTotals] = useState<{[key: string]: {spend: number; clicks: number; impressions: number; conversions: number; revenue: number}}>({});
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [showMoreCampaigns, setShowMoreCampaigns] = useState<Set<string>>(new Set());
  const [datePreset, setDatePreset] = useState<string>('last_7d');
  const [customDateRange, setCustomDateRange] = useState<{start: string; end: string}>({ start: '', end: '' });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

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
      .replace('{revenue}', dailyUpdateForm.roas || '0')
      .replace('{orders}', dailyUpdateForm.orders || '0')
      .replace('{spend}', dailyUpdateForm.spend || '0')
      .replace('{day}', dayName)
      .replace('{date}', dateStr)
      .replace('{store_url}', storeData?.store_url || '');
    
    const phone = storeData.owner_phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowDailyUpdateModal(false);
    setDailyUpdateForm({ sales: '', orders: '', roas: '', spend: '' });
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

  // جلب حالة الربط المباشر للمنصات
  const fetchDirectIntegrations = async () => {
    if (!storeId) return;
    try {
      const response = await fetch(`/api/integrations/status?storeId=${storeId}`);
      const data = await response.json();
      if (data.success && data.platforms) {
        setDirectIntegrations(data.platforms);
      }
    } catch (error) {
      console.error('Failed to fetch direct integrations:', error);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchDirectIntegrations();
    }
  }, [storeId]);

  // فتح modal Snapchat تلقائياً إذا جاء من صفحة integrations بـ ?connect=snapchat
  useEffect(() => {
    if (searchParams.get('connect') === 'snapchat' && storeData?.id) {
      openSnapchatIdentityModal();
      router.replace(`/admin/store/${paramId}`);
    }
  }, [searchParams, storeData?.id]);

  // بعد OAuth جديد — تحديث الربط وإغلاق أي modal مفتوح
  useEffect(() => {
    if (searchParams.get('snapchat') === 'connected' && storeData?.id) {
      fetchDirectIntegrations();
      setShowSnapchatIdentityModal(false);
      router.replace(`/admin/store/${paramId}`);
    }
  }, [searchParams, storeData?.id]);

  // جلب بيانات جميع المنصات فقط عند فتح قسم الحملات (lazy load)
  useEffect(() => {
    if (storeId && !isCampaignsCollapsed) {
      setLoadingCampaigns(true);
      const platforms = [
        { key: 'snapchat', datasource: 'snapchat', field: 'snapchat_account' },
        { key: 'tiktok', datasource: 'tiktok', field: 'tiktok_account' },
        { key: 'meta', datasource: 'facebook', field: 'meta_account' },
        { key: 'google', datasource: 'google_ads', field: 'google_account' }
      ];
      
      // جلب بيانات المنصات المرتبطة (Windsor أو مباشر)
      const linkedPlatforms = platforms.filter(p => {
        // التحقق من الربط المباشر
        const directIntegration = directIntegrations[p.key];
        const isDirectConnected = directIntegration?.status === 'connected' && !!directIntegration?.ad_account_id;
        // أو الربط عبر Windsor
        const isWindsorConnected = storeData?.[p.field as keyof typeof storeData];
        return isDirectConnected || isWindsorConnected;
      });
      
      if (linkedPlatforms.length === 0) {
        setLoadingCampaigns(false);
        return;
      }
      
      // جلب البيانات بالتوازي
      Promise.all(
        linkedPlatforms.map(platform => fetchPlatformCampaigns(platform.key, platform.datasource))
      ).finally(() => {
        setLoadingCampaigns(false);
      });
    }
  }, [storeId, storeData, directIntegrations, datePreset, customDateRange.start, customDateRange.end, isCampaignsCollapsed]);

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
      // استخدام Windsor API لجلب بيانات الحملات
      const datePreset = campaignDateRange === 'today' ? 'today' : 
                         campaignDateRange === 'week' ? 'last_7d' : 
                         campaignDateRange === 'month' ? 'last_30d' : 'last_7d';
      
      const response = await fetch(`/api/admin/stores/${storeId}/windsor-campaigns?date_preset=${datePreset}`);
      const data = await response.json();
      
      if (data.error) {
        setCampaignError(data.error);
      }
      if (data.summary) {
        setCampaignData({
          sales: data.summary.conversions || 0,
          revenue: data.summary.revenue || 0,
          spend: data.summary.spend || 0,
          roas: parseFloat(data.summary.roas) || 0,
          clicks: data.summary.clicks || 0,
          impressions: data.summary.impressions || 0
        });
      }
      if (data.message) {
        setCampaignError(data.message);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setCampaignError('فشل في جلب بيانات الحملات');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // جلب بيانات الحملات فقط عند فتح قسم الحملات (وليس عند أول تحميل)
  useEffect(() => {
    if (storeId && !isCampaignsCollapsed) {
      fetchCampaignData();
    }
  }, [storeId, campaignDateRange, isCampaignsCollapsed]);

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

  // جلب حسابات Windsor المتصلة حسب المنصة
  const fetchWindsorAccounts = async (platform: string) => {
    setLoadingWindsorAccounts(true);
    try {
      // تحويل اسم المنصة إلى datasource
      const datasourceMap: {[key: string]: string} = {
        'snapchat': 'snapchat',
        'tiktok': 'tiktok',
        'meta': 'facebook',
        'google': 'google_ads'
      };
      const datasource = datasourceMap[platform] || platform;
      
      // جلب الحسابات مع فلترة حسب المنصة
      const response = await fetch(`/api/admin/windsor/accounts?datasource=${datasource}`);
      const data = await response.json();
      if (data.success) {
        setWindsorAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error fetching Windsor accounts:', err);
    } finally {
      setLoadingWindsorAccounts(false);
    }
  };

  // فتح نافذة اختيار حساب Windsor
  const openWindsorAccountModal = (platform: string) => {
    setShowWindsorAccountModal(platform);
    setSelectedWindsorAccount('');
    fetchWindsorAccounts(platform);
  };

  // جلب حملات منصة معينة
  const fetchPlatformCampaigns = async (platformKey: string, datasource: string) => {
    if (!storeId) return;
    try {
      // التحقق من الربط المباشر أولاً
      const directIntegration = directIntegrations[platformKey];
      const isDirectConnected = directIntegration?.status === 'connected' && !!directIntegration?.ad_account_id;
      
      if (isDirectConnected) {
        // Snapchat: استخدام endpoint الجديد المحسّن
        if (platformKey === 'snapchat') {
          // تحويل datePreset إلى range format
          let range = '30d';
          if (datePreset === 'last_7d') range = '7d';
          else if (datePreset === 'last_30d' || datePreset === 'this_month') range = '30d';
          
          const url = `/api/stores/${storeId}/snapchat/campaigns?range=${range}`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.success && data.campaigns) {
            // تحويل البيانات للتنسيق المتوقع
            const formattedCampaigns = data.campaigns.map((c: any) => ({
              campaign: c.campaign_name,
              campaign_id: c.campaign_id,
              clicks: c.swipes || 0,
              impressions: c.impressions || 0,
              spend: c.spend || 0,
              conversions: c.orders || 0,
              revenue: c.sales || 0,
              status: c.status,
              cpa: c.cpa || 0,
              roas: c.roas || 0,
            }));
            
            setPlatformCampaigns(prev => ({ ...prev, [platformKey]: formattedCampaigns }));
            setPlatformInactiveCampaigns(prev => ({ ...prev, [platformKey]: [] }));
            setPlatformTotals(prev => ({ 
              ...prev, 
              [platformKey]: {
                spend: data.summary?.spend || 0,
                clicks: data.summary?.swipes || 0,
                impressions: data.summary?.impressions || 0,
                conversions: data.summary?.orders || 0,
                revenue: data.summary?.sales || 0,
              }
            }));
            return;
          }
        }
        
        // باقي المنصات: استخدام API الربط المباشر القديم
        let url = `/api/integrations/${platformKey}/campaigns?storeId=${storeId}&datePreset=${datePreset}`;
        if (datePreset === 'custom' && customDateRange.start && customDateRange.end) {
          url += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          setPlatformCampaigns(prev => ({ ...prev, [platformKey]: data.campaigns || [] }));
          setPlatformInactiveCampaigns(prev => ({ ...prev, [platformKey]: data.inactiveCampaigns || [] }));
          setPlatformTotals(prev => ({ 
            ...prev, 
            [platformKey]: data.totals || { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }
          }));
          return;
        }
      }
      
      // Fallback إلى Windsor API إذا لم يكن هناك ربط مباشر
      let dateParam = datePreset;
      if (datePreset === 'custom' && customDateRange.start && customDateRange.end) {
        dateParam = `custom&start_date=${customDateRange.start}&end_date=${customDateRange.end}`;
      }
      const response = await fetch(`/api/admin/stores/${storeId}/windsor-campaigns?date_preset=${dateParam}`);
      const data = await response.json();
      
      if (data.success && data.byPlatform) {
        const platformData = data.byPlatform[datasource]?.records || [];
        const platformTotal = data.byPlatform[datasource] || { spend: 0, clicks: 0, impressions: 0 };
        setPlatformCampaigns(prev => ({ ...prev, [platformKey]: platformData }));
        setPlatformTotals(prev => ({ 
          ...prev, 
          [platformKey]: { 
            spend: platformTotal.spend || 0, 
            clicks: platformTotal.clicks || 0, 
            impressions: platformTotal.impressions || 0,
            conversions: platformTotal.conversions || 0,
            revenue: platformTotal.revenue || 0
          } 
        }));
      }
    } catch (err) {
      console.error('Error fetching platform campaigns:', err);
    }
  };

  // فتح modal اختيار هوية Snapchat
  const openSnapchatIdentityModal = async () => {
    setShowSnapchatIdentityModal(true);
    setSnapchatIdentities([]);
    setSnapchatAdAccountsForAttach([]);
    setSelectedSnapchatAdAccount('');
    setSnapchatAdAccountSearch('');
    setLoadingSnapchatIdentities(true);
    try {
      const res = await fetch('/api/integrations/snapchat/identities');
      const data = await res.json();
      setSnapchatIdentities(data.identities || []);
    } catch {
      setSnapchatIdentities([]);
    } finally {
      setLoadingSnapchatIdentities(false);
    }
  };

  // ربط هوية سابقة بالمتجر الحالي
  const attachSnapchatIdentity = async (identityKey: string) => {
    if (!storeData?.id) return;
    setAttachingSnapchat(true);
    try {
      const res = await fetch('/api/integrations/snapchat/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: storeData.id, identityKey }),
      });
      const data = await res.json();
      console.log('[attach] response:', data);
      if (!data.success) {
        alert('فشل الربط: ' + (data.error || 'خطأ غير معروف'));
        return;
      }
      // استخدام Ad Accounts من الـ attach response مباشرة (أسرع وأموثوق)
      const accounts = data.adAccounts || [];
      setSnapchatAdAccountsForAttach(accounts);
      if (accounts.length === 1) {
        setSelectedSnapchatAdAccount(accounts[0].id);
      }
    } catch {
      alert('حدث خطأ في الاتصال');
    } finally {
      setAttachingSnapchat(false);
    }
  };

  // حفظ Ad Account المختار بعد الـ attach
  const saveSnapchatAdAccountAfterAttach = async () => {
    if (!storeData?.id || !selectedSnapchatAdAccount) return;
    const account = snapchatAdAccountsForAttach.find(a => a.id === selectedSnapchatAdAccount);
    if (!account) return;
    try {
      const res = await fetch(`/api/integrations/snapchat/select-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: storeData.id, adAccountId: account.id, adAccountName: account.name }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSnapchatIdentityModal(false);
        fetchDirectIntegrations();
      } else {
        alert('فشل حفظ الحساب: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch {
      alert('حدث خطأ في الاتصال');
    }
  };

  // ربط حساب Windsor بالمتجر
  const linkWindsorAccount = async () => {
    if (!storeData?.id || !showWindsorAccountModal || !selectedWindsorAccount) return;
    
    const fieldMap: { [key: string]: string } = {
      'snapchat': 'snapchat_account',
      'tiktok': 'tiktok_account',
      'meta': 'meta_account',
      'google': 'google_account'
    };
    
    const field = fieldMap[showWindsorAccountModal];
    if (!field) return;

    try {
      const response = await fetch(`/api/admin/stores/${storeData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: selectedWindsorAccount })
      });

      if (response.ok) {
        setStoreData(prev => prev ? { ...prev, [field]: selectedWindsorAccount } : null);
        setShowWindsorAccountModal(null);
        setSelectedWindsorAccount('');
        // إعادة جلب بيانات الحملات
        fetchCampaignData();
      }
    } catch (err) {
      console.error('Error linking Windsor account:', err);
    }
  };

  const fetchStoreData = async () => {
    try {
      // التحقق إذا كان المعرف هو UUID أو store_url
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
      
      let response: Response | null = null;
      let storeFromApi: any = null;
      if (isUUID) {
        // جلب بيانات المتجر بالـ ID أولاً
        const storeResponse = await fetch(`/api/admin/stores/${paramId}`);
        const storeResult = await storeResponse.json();
        
        if (storeResponse.ok && storeResult.store) {
          storeFromApi = storeResult.store;
          // حفظ بيانات المتجر و storeId فوراً
          setStoreData(storeFromApi);
          setStoreId(storeFromApi.id);
          
          const storeUrl = storeResult.store.store_url;
          try {
            response = await fetch(`/api/tasks?store_url=${encodeURIComponent(storeUrl)}`);
          } catch {
            // المهام اختيارية — المتجر يظهر حتى بدونها
          }
        } else {
          setLoading(false);
          return;
        }
      } else {
        response = await fetch(`/api/tasks?store_url=${encodeURIComponent(paramId)}`);
      }
      
      if (response) {
        const data = await response.json();
        if (response.ok) {
          setTasks(data.tasks || {});
          setStats(data.stats || { total: 0, completed: 0, percentage: 0 });
          if (data.store_id) setStoreId(data.store_id);
          // بيانات المتجر: الأولوية لـ storeFromApi (أكمل)
          if (!storeFromApi && data.store) setStoreData(data.store);
        }
      }
      
      // جلب رسائل واتساب للأقسام من localStorage
      const savedCategoryMessages = localStorage.getItem('categoryWhatsappMessages');
      if (savedCategoryMessages) {
        setCategoryWhatsappMessages(JSON.parse(savedCategoryMessages));
      }
      
      // جلب معلومات المتجر (الشعار والاسم)
      const metaUrl = storeFromApi?.store_url || paramId;
      if (metaUrl) {
        try {
          const metaResponse = await fetch(`/api/store/metadata?url=${encodeURIComponent(metaUrl)}`);
          const metaData = await metaResponse.json();
          setStoreMetadata({
            name: metaData.name || metaUrl,
            logo: metaData.logo,
          });
        } catch {
          // metadata اختياري
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch store data:', err);
      setLoading(false);
    }
  };

  // دالة لاستبدال متغيرات رسالة واتساب ببيانات المتجر الفعلية
  const replaceWhatsappVariables = (message: string) => {
    if (!message) return '';
    
    return message
      .replace(/\{\{store_name\}\}/g, storeData?.store_name || '')
      .replace(/\{\{store_url\}\}/g, storeData?.store_url || '')
      .replace(/\{\{owner_name\}\}/g, storeData?.owner_name || '')
      .replace(/\{\{account_manager\}\}/g, storeData?.account_manager?.name || '');
  };

  // دالة لفتح واتساب مع الرسالة المخصصة للمهمة
  const openWhatsappWithMessage = (task: any, categoryName: string, isReminder: boolean = false) => {
    if (!task.whatsapp_message || !storeData?.owner_phone) return;
    
    let message = replaceWhatsappVariables(task.whatsapp_message);
    
    // إضافة كلمة "تذكير" في بداية الرسالة إذا كانت رسالة تذكيرية مع علامة اقتباس
    if (isReminder) {
      message = `تذكير:\n"${message}"`;
    }
    
    // تسجيل أن الرسالة تم إرسالها أولاً قبل فتح النافذة
    setSentWhatsappTasks(prev => {
      const newSet = new Set(prev);
      newSet.add(task.id);
      return newSet;
    });
    
    const phone = storeData.owner_phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  // دالة لفتح واتساب مع الرسالة المخصصة للقسم بالكامل
  const openCategoryWhatsapp = (category: string, isReminder: boolean = false) => {
    const categoryMessage = categoryWhatsappMessages[category];
    if (!categoryMessage || !storeData?.owner_phone) return;
    
    let message = replaceWhatsappVariables(categoryMessage);
    
    // إضافة كلمة "تذكير" في بداية الرسالة إذا كانت رسالة تذكيرية
    if (isReminder) {
      message = `تذكير:\n"${message}"`;
    }
    
    // تسجيل أن الرسالة تم إرسالها
    setSentWhatsappCategories(prev => {
      const newSet = new Set(prev);
      newSet.add(category);
      return newSet;
    });
    
    const phone = storeData.owner_phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
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
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    // إعادة جلب بيانات المتجر بعد التعديل
    fetchStoreData();
    setShowEditModal(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!storeData?.id) return;

    try {
      const response = await fetch(`/api/admin/stores/${storeData.id}`, {
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
    if (!storeData?.id) return;

    try {
      const response = await fetch(`/api/admin/stores/${storeData.id}`, {
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
              onClick={() => {
                // تعبئة البيانات من الحملات الإعلانية تلقائياً
                if (snapchatSummary) {
                  setDailyUpdateForm({
                    sales: snapchatSummary.sales.toLocaleString('en-US', { maximumFractionDigits: 0 }),
                    orders: snapchatSummary.orders.toLocaleString('en-US'),
                    roas: snapchatSummary.roas.toFixed(2),
                    spend: snapchatSummary.spend.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  });
                }
                setShowDailyUpdateModal(true);
              }}
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
        <div className="bg-purple-950/40  rounded-2xl border border-purple-500/20 mb-6 overflow-hidden">
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
                      className="flex items-center text-green-400 hover:text-green-300 transition-colors"
                      title="واتساب"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
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
                {storeData?.store_group_url && (
                  <a 
                    href={storeData.store_group_url.startsWith('http') ? storeData.store_group_url : `https://${storeData.store_group_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    title="قناة التواصل"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    قناة التواصل
                  </a>
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

        {/* قائمة المهام - مربع قابل للطي مع شريط التقدم */}
        <div className="bg-purple-950/40  rounded-2xl border border-purple-500/20 overflow-hidden mb-6">
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
          
          {/* Progress Bar - شريط التقدم */}
          <div className="px-4 pb-4">
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

          {/* محتوى قائمة المهام */}
          {!isTasksListCollapsed && (
            <div className="p-4 pt-0 space-y-4">
              {Object.entries(tasks).map(([category, categoryTasks]) => {
            const catStats = getCategoryStats(categoryTasks);
            const isCollapsed = collapsedCategories?.has(category) ?? true;
            return (
              <div key={category} className="bg-purple-950/40  rounded-2xl border border-purple-500/20 overflow-hidden">
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
                    {/* زر واتساب للقسم بالكامل - يسار عدد المهام */}
                    {categoryWhatsappMessages[category] && storeData?.owner_phone && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {sentWhatsappCategories.has(category) ? (
                          <>
                            <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <button
                              onClick={() => openCategoryWhatsapp(category, true)}
                              className="p-2 text-orange-400 border border-orange-500/30 hover:border-orange-400/50 hover:bg-orange-500/10 rounded-lg transition-all"
                              title="إرسال تذكير للقسم"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openCategoryWhatsapp(category)}
                            className="p-2 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-lg transition-all"
                            title="إرسال رسالة واتساب للقسم"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
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

                        {/* WhatsApp Button - يظهر فقط إذا كانت المهمة لها رسالة مخصصة ورقم صاحب المتجر موجود */}
                        {task.whatsapp_message && storeData?.owner_phone && (
                          <div className="flex items-center gap-1">
                            {sentWhatsappTasks.has(task.id) ? (
                              <>
                                {/* علامة تم الإرسال */}
                                <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="hidden sm:inline">تم الإرسال</span>
                                </span>
                                {/* زر تذكيري */}
                                <button
                                  onClick={() => openWhatsappWithMessage(task, category, true)}
                                  className="p-2 text-orange-400 border border-orange-500/30 hover:border-orange-400/50 hover:bg-orange-500/10 rounded-lg transition-all"
                                  title="إرسال تذكير"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              /* زر إرسال واتساب */
                              <button
                                onClick={() => openWhatsappWithMessage(task, category)}
                                className="p-2 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-lg transition-all"
                                title="إرسال رسالة واتساب"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}

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

        {/* قسم الحملات الإعلانية - الجديد */}
        <SnapchatCampaignsSection 
          storeId={storeId} 
          directIntegrations={directIntegrations} 
          onDataLoaded={(summary) => setSnapchatSummary(summary)}
          onConnectClick={() => {
            if (!storeData?.id) {
              alert('لم يتم تحميل معرف المتجر بعد، حدّث الصفحة وحاول مرة أخرى.');
              return;
            }
            openSnapchatIdentityModal();
          }}
        />

        {/* قسم الحملات الإعلانية القديم - مخفي */}
        <div className="hidden bg-purple-950/40  rounded-2xl border border-purple-500/20 overflow-hidden">
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
              {/* اختيار الفترة الزمنية */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm text-purple-300">الفترة:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'today', label: 'اليوم' },
                    { value: 'yesterday', label: 'أمس' },
                    { value: 'last_7d', label: '7 أيام' },
                    { value: 'last_14d', label: '14 يوم' },
                    { value: 'last_30d', label: '30 يوم' },
                    { value: 'this_month', label: 'هذا الشهر' },
                    { value: 'last_month', label: 'الشهر الماضي' },
                  ].map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setDatePreset(preset.value);
                        setShowCustomDatePicker(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        datePreset === preset.value && !showCustomDatePicker
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      showCustomDatePicker
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/50'
                    }`}
                  >
                    مخصص
                  </button>
                </div>
              </div>

              {/* اختيار التاريخ المخصص */}
              {showCustomDatePicker && (
                <div className="flex flex-wrap items-center gap-3 p-3 bg-purple-900/20 rounded-xl border border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-purple-300">من:</label>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="px-3 py-1.5 text-xs bg-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-purple-300">إلى:</label>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="px-3 py-1.5 text-xs bg-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (customDateRange.start && customDateRange.end) {
                        setDatePreset('custom');
                      }
                    }}
                    disabled={!customDateRange.start || !customDateRange.end}
                    className="px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-purple-500 text-white rounded-lg transition-colors"
                  >
                    تطبيق
                  </button>
                </div>
              )}

              {/* بطاقات الأرقام — تعطي الأولوية لبيانات Snapchat المباشرة */}
              {snapchatSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-xl p-4 border border-yellow-500/20">
                    <p className="text-xs text-yellow-400 mb-1">الطلبات</p>
                    <p className="text-2xl font-bold text-white">{snapchatSummary.orders.toLocaleString('en-US')}</p>
                    <p className="text-xs text-yellow-400/70">طلب</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-blue-400 mb-1">المبيعات</p>
                    <p className="text-2xl font-bold text-white">{snapchatSummary.sales.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-blue-400/70">ر.س</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/20">
                    <p className="text-xs text-orange-400 mb-1">الصرف</p>
                    <p className="text-2xl font-bold text-white">{snapchatSummary.spend.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-orange-400/70">ر.س</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-xs text-purple-400 mb-1">ROAS</p>
                    <p className={`text-2xl font-bold ${snapchatSummary.roas < 1 ? 'text-red-400' : 'text-white'}`}>{snapchatSummary.roas.toFixed(2)}x</p>
                    <p className="text-xs text-purple-400/70">العائد على الإنفاق</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/20">
                    <p className="text-xs text-green-400 mb-1">النقرات</p>
                    <p className="text-2xl font-bold text-white">{campaignData ? (campaignData.clicks || 0).toLocaleString() : '--'}</p>
                    <p className="text-xs text-green-400/70">نقرة</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-blue-400 mb-1">التحويلات</p>
                    <p className="text-2xl font-bold text-white">{campaignData ? campaignData.sales.toLocaleString() : '--'}</p>
                    <p className="text-xs text-blue-400/70">تحويل</p>
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
              )}

              {/* المنصات - الربط المباشر */}
              <div className="space-y-3 relative">
                <h3 className="text-sm font-medium text-purple-300">ربط المنصات الإعلانية</h3>
                
                {/* مؤشر التحميل على كامل المنصات */}
                {loadingCampaigns && (
                  <div className="absolute inset-0 bg-[#0a0118]/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                      <span className="text-purple-300 text-sm font-medium">جاري تحديث البيانات...</span>
                    </div>
                  </div>
                )}
                
                {[
                  { key: 'snapchat', name: 'Snapchat', bgColor: 'bg-yellow-500/10 border border-yellow-500/30', cardBg: 'bg-yellow-500/10 border-yellow-500/30', textColor: 'text-yellow-400', field: 'snapchat_account', datasource: 'snapchat', datasourceAlt: ['snapchat', 'snap', 'snapchat_marketing'], icon: (
                    <svg className="w-6 h-6" viewBox="0 0 512 512" fill="currentColor">
                      <path d="M496.926,366.6c-3.373-9.176-9.8-14.086-17.112-18.153-1.376-.806-2.641-1.451-3.72-1.947-2.182-1.128-4.414-2.22-6.634-3.373-22.8-12.09-40.609-27.341-52.959-45.42a102.889,102.889,0,0,1-9.089-16.269c-1.054-2.766-.992-4.377-.065-5.954a11.249,11.249,0,0,1,3.088-2.818c2.766-1.8,5.669-3.373,8.2-4.7,4.7-2.5,8.5-4.5,10.9-5.954,7.287-4.477,12.5-9.4,15.5-14.629a24.166,24.166,0,0,0,1.863-22.031c-4.328-12.266-17.9-19.263-28.263-19.263a35.007,35.007,0,0,0-9.834,1.376c-.124.037-.236.074-.347.111,0-1.451.024-2.915.024-4.377,0-22.92-2.508-46.152-10.9-67.615C378.538,91.727,341.063,56.7,286.741,50.6a118.907,118.907,0,0,0-12.293-.621h-36.9a118.907,118.907,0,0,0-12.293.621c-54.31,6.1-91.785,41.127-110.839,84.168-8.4,21.463-10.9,44.7-10.9,67.615,0,1.462.012,2.926.024,4.377-.111-.037-.223-.074-.347-.111a35.007,35.007,0,0,0-9.834-1.376c-10.362,0-23.935,7-28.263,19.263a24.166,24.166,0,0,0,1.863,22.031c3,5.233,8.213,10.152,15.5,14.629,2.4,1.451,6.2,3.46,10.9,5.954,2.52,1.327,5.418,2.9,8.181,4.7a11.3,11.3,0,0,1,3.088,2.818c.927,1.576.989,3.187-.065,5.954a102.889,102.889,0,0,1-9.089,16.269c-12.35,18.079-30.161,33.33-52.959,45.42-2.22,1.153-4.452,2.245-6.634,3.373-1.079.5-2.344,1.141-3.72,1.947-7.312,4.067-13.739,8.977-17.112,18.153-3.6,9.834-1.044,20.882,7.6,32.838,8.7,12.017,20.018,18.4,33.787,19.016,4.278.2,8.7-.161,13.168-.533,3.9-.322,7.9-.657,11.778-.657a53.666,53.666,0,0,1,9.725.806,51.1,51.1,0,0,1,3.249.818c.682,1.054,1.376,2.182,2.108,3.4,4.7,7.823,11.168,18.54,24.077,29.2,13.8,11.4,32.018,21.041,57.271,28.489a12.478,12.478,0,0,1,3.633,1.54,11.5,11.5,0,0,1,1.985,1.985c3.088,4.278,8.083,7.947,15.259,11.242,8.362,3.844,18.8,6.746,31.1,8.635a245.762,245.762,0,0,0,37.238,2.817c12.8,0,25.371-.918,37.238-2.817,12.3-1.889,22.738-4.791,31.1-8.635,7.176-3.3,12.171-6.964,15.259-11.242a11.5,11.5,0,0,1,1.985-1.985,12.478,12.478,0,0,1,3.633-1.54c25.253-7.448,43.469-17.087,57.271-28.489,12.909-10.659,19.375-21.376,24.077-29.2.732-1.215,1.426-2.344,2.108-3.4a51.1,51.1,0,0,1,3.249-.818,53.666,53.666,0,0,1,9.725-.806c3.879,0,7.882.335,11.778.657,4.465.372,8.89.731,13.168.533,13.769-.62,25.091-7,33.787-19.016C497.97,387.482,500.526,376.434,496.926,366.6Z"/>
                    </svg>
                  )},
                  { key: 'tiktok', name: 'TikTok', bgColor: 'bg-white/10 border border-white/30', cardBg: 'bg-gray-800/30 border-gray-600/30', textColor: 'text-white', field: 'tiktok_account', datasource: 'tiktok', icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                  )},
                  { key: 'meta', name: 'Meta', bgColor: 'bg-indigo-500/10 border border-indigo-500/30', cardBg: 'bg-blue-500/10 border-blue-500/30', textColor: 'text-indigo-400', field: 'meta_account', datasource: 'facebook', icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
                    </svg>
                  )},
                  { key: 'google', name: 'Google Ads', bgColor: 'bg-green-500/10 border border-green-500/30', cardBg: 'bg-green-500/10 border-green-500/30', textColor: 'text-green-400', field: 'google_account', datasource: 'google_ads', icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )},
                ].map(platform => {
                  // استخدام الربط المباشر بدلاً من Windsor
                  const directIntegration = directIntegrations[platform.key];
                  const isConnected = directIntegration?.status === 'connected' && !!directIntegration?.ad_account_id;
                  const needsReauth = directIntegration?.status === 'needs_reauth';
                  const hasError = directIntegration?.status === 'error';
                  const isExpanded = expandedPlatforms.has(platform.key);
                  const campaigns = platformCampaigns[platform.key] || [];
                  const inactiveCampaigns = platformInactiveCampaigns[platform.key] || [];
                  const showMore = showMoreCampaigns.has(platform.key);
                  const totals = platformTotals[platform.key] || { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 };
                  
                  return (
                    <div key={platform.key} className={`rounded-xl border overflow-hidden ${platform.cardBg}`}>
                      {/* رأس المنصة */}
                      <div 
                        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-purple-900/30 transition-colors ${isConnected ? '' : 'cursor-default'}`}
                        onClick={() => {
                          if (isConnected) {
                            if (!isExpanded) {
                              fetchPlatformCampaigns(platform.key, platform.datasource);
                            }
                            setExpandedPlatforms(prev => {
                              const newSet = new Set(prev);
                              if (isExpanded) {
                                newSet.delete(platform.key);
                              } else {
                                newSet.add(platform.key);
                              }
                              return newSet;
                            });
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className={`w-10 h-10 rounded-xl ${platform.bgColor} flex items-center justify-center flex-shrink-0 ${platform.textColor}`}>
                            {platform.icon}
                          </div>
                          <div>
                            <p className="text-white font-medium">{platform.name}</p>
                            <p className="text-xs text-purple-400 truncate max-w-[150px]" title={directIntegration?.ad_account_name || 'غير مرتبط'}>
                              {isConnected ? directIntegration?.ad_account_name : needsReauth ? 'يحتاج إعادة ربط' : hasError ? 'خطأ في الربط' : 'غير مرتبط'}
                            </p>
                          </div>
                        </div>
                        
                        {/* إجمالي المنصة */}
                        {isConnected && totals.spend > 0 && (
                          <div className="flex items-center text-xs" dir="ltr">
                            <div className="text-center w-[70px]">
                              <p className="text-purple-400">الطلبات</p>
                              <p className="text-green-400 font-bold">{totals.conversions.toLocaleString()}</p>
                            </div>
                            <div className="text-center w-[80px]">
                              <p className="text-purple-400">المبيعات</p>
                              <p className="text-blue-400 font-bold">{totals.revenue.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="text-center w-[80px]">
                              <p className="text-purple-400">الصرف</p>
                              <p className="text-orange-400 font-bold">{totals.spend.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="text-center w-[60px]">
                              <p className="text-purple-400">ROAS</p>
                              <p className={`font-bold ${totals.spend > 0 && (totals.revenue / totals.spend) < 1 ? 'text-red-400' : 'text-purple-400'}`}>
                                {totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0.00'}x
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {isConnected ? (
                            <>
                              <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">مرتبط</span>
                              {/* زر تغيير الحساب */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!storeData?.id) {
                                    alert('لم يتم تحميل معرف المتجر بعد، حدّث الصفحة وحاول مرة أخرى.');
                                    return;
                                  }
                                  if (platform.key === 'snapchat') {
                                    openSnapchatIdentityModal();
                                  } else {
                                    window.location.href = `/admin/store/${storeId}/integrations`;
                                  }
                                }}
                                className="px-2 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                title="تغيير الحساب"
                              >
                                تغيير
                              </button>
                              {/* زر فصل الربط */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!storeData?.id) {
                                    alert('لم يتم تحميل معرف المتجر بعد، حدّث الصفحة وحاول مرة أخرى.');
                                    return;
                                  }
                                  if (!confirm('هل أنت متأكد من فصل الربط؟')) return;
                                  try {
                                    const response = await fetch(`/api/integrations/${platform.key}/disconnect`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ storeId: storeData?.id }),
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                      // تحديث الصفحة لإعادة جلب البيانات
                                      window.location.reload();
                                    } else {
                                      alert('فشل في فصل الربط: ' + (data.error || 'خطأ غير معروف'));
                                    }
                                  } catch (error) {
                                    console.error('Disconnect error:', error);
                                    alert('حدث خطأ في الاتصال');
                                  }
                                }}
                                className="px-2 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                title="فصل الربط"
                              >
                                فصل
                              </button>
                              <svg className={`w-5 h-5 text-purple-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          ) : needsReauth ? (
                            platform.key === 'snapchat' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!storeData?.id) {
                                    alert('لم يتم تحميل معرف المتجر بعد، حدّث الصفحة وحاول مرة أخرى.');
                                    return;
                                  }
                                  openSnapchatIdentityModal();
                                }}
                                className="px-4 py-1.5 rounded-lg text-xs bg-orange-500/30 text-orange-300 hover:bg-orange-500/50 transition-colors"
                              >
                                إعادة الربط
                              </button>
                            ) : (
                              <Link
                                href={`/admin/store/${storeId}/integrations`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-4 py-1.5 rounded-lg text-xs bg-orange-500/30 text-orange-300 hover:bg-orange-500/50 transition-colors"
                              >
                                إعادة الربط
                              </Link>
                            )
                          ) : hasError ? (
                            <Link
                              href={`/admin/store/${storeId}/integrations`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-4 py-1.5 rounded-lg text-xs bg-red-500/30 text-red-300 hover:bg-red-500/50 transition-colors"
                            >
                              إصلاح
                            </Link>
                          ) : (
                            platform.key === 'snapchat' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!storeData?.id) {
                                    alert('لم يتم تحميل معرف المتجر بعد، حدّث الصفحة وحاول مرة أخرى.');
                                    return;
                                  }
                                  openSnapchatIdentityModal();
                                }}
                                className="px-4 py-1.5 rounded-lg text-xs bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors"
                              >
                                ربط Snapchat
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/admin/store/${storeId}/integrations`;
                                }}
                                className="px-4 py-1.5 rounded-lg text-xs bg-purple-500/30 text-purple-300 hover:bg-purple-500/50 transition-colors"
                              >
                                ربط
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      
                      {/* تفاصيل الحملات */}
                      {isConnected && isExpanded && (
                        <div className="border-t border-purple-500/10 p-4 bg-purple-900/10">
                          {campaigns.length > 0 ? (() => {
                            // تجميع الحملات حسب اسم الحملة مع الإعلانات
                            const groupedCampaigns = campaigns.reduce((acc: any, c: any) => {
                              const name = c.campaign || 'غير محدد';
                              if (!acc[name]) {
                                acc[name] = { campaign: name, clicks: 0, impressions: 0, spend: 0, conversions: 0, revenue: 0, ads: {} };
                              }
                              acc[name].clicks += c.clicks || 0;
                              acc[name].impressions += c.impressions || 0;
                              acc[name].spend += c.spend || 0;
                              acc[name].conversions += c.conversions || c.purchases || c.purchase || 0;
                              acc[name].revenue += c.revenue || c.purchase_value || 0;
                              // تجميع الإعلانات داخل الحملة
                              const adName = c.ad_name || 'إعلان غير محدد';
                              if (!acc[name].ads[adName]) {
                                acc[name].ads[adName] = { ad_name: adName, ad_id: c.ad_id, clicks: 0, impressions: 0, spend: 0, conversions: 0, revenue: 0 };
                              }
                              acc[name].ads[adName].clicks += c.clicks || 0;
                              acc[name].ads[adName].impressions += c.impressions || 0;
                              acc[name].ads[adName].spend += c.spend || 0;
                              acc[name].ads[adName].conversions += c.conversions || c.purchases || c.purchase || 0;
                              acc[name].ads[adName].revenue += c.revenue || c.purchase_value || 0;
                              return acc;
                            }, {});
                            const uniqueCampaigns = Object.values(groupedCampaigns);
                            
                            return (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-purple-400 text-xs">
                                    <th className="text-right pb-2 pr-2">الحملة</th>
                                    <th className="text-center pb-2">النقرات</th>
                                    <th className="text-center pb-2">المشاهدات</th>
                                    <th className="text-center pb-2">الطلبات</th>
                                    <th className="text-center pb-2">المبيعات</th>
                                    <th className="text-center pb-2">الصرف</th>
                                    <th className="text-center pb-2">ROAS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {uniqueCampaigns.slice(0, 5).map((campaign: any, idx: number) => {
                                    const roas = campaign.spend > 0 ? (campaign.revenue / campaign.spend) : 0;
                                    const isLowRoas = roas < 1;
                                    const campaignKey = `${platform.key}-${campaign.campaign}`;
                                    const isCampaignExpanded = expandedCampaigns.has(campaignKey);
                                    const ads = Object.values(campaign.ads || {});
                                    return (
                                    <React.Fragment key={idx}>
                                    <tr 
                                      className="border-t border-purple-500/10 text-white cursor-pointer hover:bg-purple-900/20"
                                      onClick={() => {
                                        setExpandedCampaigns(prev => {
                                          const newSet = new Set(prev);
                                          if (isCampaignExpanded) {
                                            newSet.delete(campaignKey);
                                          } else {
                                            newSet.add(campaignKey);
                                          }
                                          return newSet;
                                        });
                                      }}
                                    >
                                      <td className="py-2 pr-2 text-right truncate max-w-[200px]" title={campaign.campaign}>
                                        <span className="flex items-center gap-1">
                                          <svg className={`w-4 h-4 text-purple-400 transition-transform ${isCampaignExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                          {campaign.campaign || '-'}
                                        </span>
                                      </td>
                                      <td className="py-2 text-center">{(campaign.clicks || 0).toLocaleString()}</td>
                                      <td className="py-2 text-center">{(campaign.impressions || 0).toLocaleString()}</td>
                                      <td className="py-2 text-center text-green-400">{(campaign.conversions || 0).toLocaleString()}</td>
                                      <td className="py-2 text-center text-blue-400">{(campaign.revenue || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</td>
                                      <td className="py-2 text-center text-orange-400">{(campaign.spend || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</td>
                                      <td className={`py-2 text-center ${isLowRoas ? 'text-red-400' : 'text-purple-400'}`}>
                                        {isLowRoas && <span className="mr-1">⚠️</span>}
                                        {roas.toFixed(2)}x
                                      </td>
                                    </tr>
                                    {/* الإعلانات داخل الحملة */}
                                    {isCampaignExpanded && ads.map((ad: any, adIdx: number) => {
                                      const adRoas = ad.spend > 0 ? (ad.revenue / ad.spend) : 0;
                                      const isAdLowRoas = adRoas < 1;
                                      return (
                                        <tr key={`ad-${adIdx}`} className="bg-purple-900/30 text-purple-200 text-xs">
                                          <td className="py-1.5 pr-6 text-right max-w-[200px]" title={ad.ad_name}>
                                            <span className="truncate">↳ {ad.ad_name || '-'}</span>
                                          </td>
                                          <td className="py-1.5 text-center">{(ad.clicks || 0).toLocaleString()}</td>
                                          <td className="py-1.5 text-center">{(ad.impressions || 0).toLocaleString()}</td>
                                          <td className="py-1.5 text-center text-green-400/70">{(ad.conversions || 0).toLocaleString()}</td>
                                          <td className="py-1.5 text-center text-blue-400/70">{(ad.revenue || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</td>
                                          <td className="py-1.5 text-center text-orange-400/70">{(ad.spend || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</td>
                                          <td className={`py-1.5 text-center ${isAdLowRoas ? 'text-red-400/70' : 'text-purple-400/70'}`}>
                                            {adRoas.toFixed(2)}x
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    </React.Fragment>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-purple-500/30 text-white font-bold bg-purple-900/30">
                                    <td className="py-3 pr-2 text-right">الإجمالي</td>
                                    <td className="py-3 text-center text-green-400">
                                      {totals.clicks.toLocaleString()}
                                    </td>
                                    <td className="py-3 text-center text-blue-400">
                                      {totals.impressions.toLocaleString()}
                                    </td>
                                    <td className="py-3 text-center text-green-400">-</td>
                                    <td className="py-3 text-center text-blue-400">-</td>
                                    <td className="py-3 text-center text-orange-400">
                                      {totals.spend.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س
                                    </td>
                                    <td className="py-3 text-center text-purple-400">-</td>
                                  </tr>
                                </tfoot>
                              </table>
                              
                              {/* زر المزيد لعرض الحملات غير النشطة */}
                              {inactiveCampaigns.length > 0 && (
                                <div className="mt-4 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowMoreCampaigns(prev => {
                                        const newSet = new Set(prev);
                                        if (showMore) {
                                          newSet.delete(platform.key);
                                        } else {
                                          newSet.add(platform.key);
                                        }
                                        return newSet;
                                      });
                                    }}
                                    className="px-4 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                                  >
                                    <svg className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {showMore ? 'إخفاء الحملات القديمة' : `المزيد (${inactiveCampaigns.length} حملة قديمة)`}
                                  </button>
                                  
                                  {/* عرض الحملات غير النشطة */}
                                  {showMore && (
                                    <div className="mt-4 border-t border-purple-500/20 pt-4">
                                      <p className="text-xs text-purple-400 mb-3">الحملات غير النشطة</p>
                                      <div className="space-y-2">
                                        {inactiveCampaigns.map((campaign: any, idx: number) => (
                                          <div key={idx} className="flex items-center justify-between p-2 bg-purple-900/20 rounded-lg text-sm">
                                            <span className="text-purple-300 truncate max-w-[200px]" title={campaign.campaign}>
                                              {campaign.campaign}
                                            </span>
                                            <span className="text-xs text-purple-500 px-2 py-0.5 bg-purple-900/50 rounded">
                                              {campaign.status === 'DELETED' ? 'محذوفة' : 
                                               campaign.status === 'COMPLETED' ? 'مكتملة' : 
                                               campaign.status === 'ARCHIVED' ? 'مؤرشفة' : campaign.status}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            );
                          })() : (
                            <p className="text-center text-purple-400 text-sm py-4">لا توجد بيانات حملات متاحة</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نافذة اختيار هوية Snapchat */}
      {showSnapchatIdentityModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSnapchatIdentityModal(false)}>
          <div className="bg-[#1a0a2e] border border-yellow-500/30 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white">ربط Snapchat</h3>
              <button onClick={() => setShowSnapchatIdentityModal(false)} className="text-purple-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* مرحلة 1: اختيار هوية أو ربط جديد */}
            {snapchatAdAccountsForAttach.length === 0 && (
              <>
                {loadingSnapchatIdentities ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                    <span className="mr-3 text-yellow-400 text-sm">جاري تحميل الحسابات...</span>
                  </div>
                ) : (
                  <>
                    {snapchatIdentities.length > 0 && (
                      <div className="mb-5">
                        <p className="text-sm text-purple-300 mb-3">حسابات سبق ربطها — اختر للربط الفوري:</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {snapchatIdentities.map((identity) => (
                            <button
                              key={identity.identity_key}
                              onClick={() => attachSnapchatIdentity(identity.identity_key)}
                              disabled={attachingSnapchat}
                              className="w-full flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors text-right disabled:opacity-50"
                            >
                              <div>
                                <p className="text-white text-sm font-medium">{identity.display_name || identity.identity_key}</p>
                                {identity.last_used_at && (
                                  <p className="text-xs text-purple-400 mt-0.5">
                                    آخر استخدام: {new Date(identity.last_used_at).toLocaleDateString('ar-SA')}
                                  </p>
                                )}
                              </div>
                              {attachingSnapchat ? (
                                <div className="w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                              ) : (
                                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="my-4 flex items-center gap-3">
                          <div className="flex-1 h-px bg-purple-500/20"></div>
                          <span className="text-xs text-purple-400">أو</span>
                          <div className="flex-1 h-px bg-purple-500/20"></div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowSnapchatIdentityModal(false);
                        window.location.href = `/api/integrations/snapchat/start?storeId=${storeData?.id}&force=true`;
                      }}
                      className="w-full py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M496.926 366.6c-3.7 9.5-9.3 18.3-16.6 25.5-6.4 6.4-13.8 11.5-21.9 15.2-8.1 3.7-16.8 5.6-25.6 5.6H78.3c-8.8 0-17.5-1.9-25.6-5.6-8.1-3.7-15.5-8.8-21.9-15.2-7.3-7.2-12.9-16-16.6-25.5-3.7-9.5-5.2-19.7-4.3-29.8L46.6 96.3C48.5 77.2 65 62.5 84.2 62.5h343.6c19.2 0 35.7 14.7 37.6 33.8l36.7 240.5c.9 10.1-.6 20.3-4.3 29.8z"/>
                      </svg>
                      ربط حساب Snapchat جديد
                    </button>
                    {snapchatIdentities.length > 0 && (
                      <button
                        onClick={() => {
                          setShowSnapchatIdentityModal(false);
                          window.location.href = `/api/integrations/snapchat/start?storeId=${storeData?.id}`;
                        }}
                        className="w-full py-2 rounded-xl bg-purple-800/40 border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-700/40 transition-colors"
                      >
                        استخدام نفس الحساب المسجّل
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* مرحلة 2: اختيار Ad Account بعد الـ attach */}
            {snapchatAdAccountsForAttach.length > 0 && (
              <>
                <p className="text-sm text-green-400 mb-3">✓ تم الربط بنجاح! اختر الحساب الإعلاني:</p>
                {/* مربع البحث */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={snapchatAdAccountSearch}
                    onChange={e => setSnapchatAdAccountSearch(e.target.value)}
                    placeholder="ابحث عن حساب..."
                    className="w-full px-4 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-white placeholder-purple-400/50 text-sm focus:outline-none focus:border-yellow-500/50"
                    dir="rtl"
                  />
                  {snapchatAdAccountSearch && (
                    <button
                      onClick={() => setSnapchatAdAccountSearch('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white text-xs"
                    >✕</button>
                  )}
                </div>
                {loadingSnapchatAdAccounts ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
                    {snapchatAdAccountsForAttach
                      .filter(acc =>
                        !snapchatAdAccountSearch ||
                        acc.name.toLowerCase().includes(snapchatAdAccountSearch.toLowerCase()) ||
                        acc.id.toLowerCase().includes(snapchatAdAccountSearch.toLowerCase())
                      )
                      .map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => setSelectedSnapchatAdAccount(acc.id)}
                          className={`w-full p-3 rounded-xl text-right transition-all ${
                            selectedSnapchatAdAccount === acc.id
                              ? 'bg-yellow-500/30 border-2 border-yellow-500 text-white'
                              : 'bg-purple-900/30 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                          }`}
                        >
                          <p className="font-medium text-sm">{acc.name}</p>
                          <p className="text-xs opacity-60 mt-0.5" dir="ltr">{acc.id}</p>
                        </button>
                      ))}
                    {snapchatAdAccountsForAttach.filter(acc =>
                      !snapchatAdAccountSearch ||
                      acc.name.toLowerCase().includes(snapchatAdAccountSearch.toLowerCase()) ||
                      acc.id.toLowerCase().includes(snapchatAdAccountSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="text-center text-purple-400/60 text-sm py-4">لا توجد نتائج</p>
                    )}
                  </div>
                )}
                <button
                  onClick={saveSnapchatAdAccountAfterAttach}
                  disabled={!selectedSnapchatAdAccount}
                  className="w-full py-3 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  حفظ الحساب الإعلاني
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* نافذة اختيار حساب Windsor */}
      {showWindsorAccountModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWindsorAccountModal(null)}>
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                ربط {showWindsorAccountModal === 'snapchat' ? 'Snapchat' : 
                     showWindsorAccountModal === 'tiktok' ? 'TikTok' : 
                     showWindsorAccountModal === 'meta' ? 'Meta' : 'Google Ads'}
              </h3>
              <button
                onClick={() => setShowWindsorAccountModal(null)}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {loadingWindsorAccounts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* إدخال اسم الحساب يدوياً */}
                  <div>
                    <label className="block text-sm text-purple-300 mb-2">أدخل اسم الحساب الإعلاني</label>
                    <input
                      type="text"
                      value={selectedWindsorAccount}
                      onChange={(e) => setSelectedWindsorAccount(e.target.value)}
                      placeholder="مثال: My Snapchat Ads Account"
                      className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                      dir="ltr"
                    />
                    <p className="text-xs text-purple-400/70 mt-2">
                      أدخل اسم الحساب كما يظهر في Windsor.ai
                    </p>
                  </div>

                  {/* عرض الحسابات المتاحة من Windsor إن وجدت */}
                  {windsorAccounts.length > 0 && (
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">أو اختر من الحسابات المتاحة</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {windsorAccounts.map((account, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedWindsorAccount(account.account_name)}
                            className={`w-full p-3 rounded-xl text-right transition-all ${
                              selectedWindsorAccount === account.account_name
                                ? 'bg-purple-500/30 border-2 border-purple-500 text-white'
                                : 'bg-purple-900/30 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {selectedWindsorAccount === account.account_name && (
                                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{account.account_name}</p>
                                <p className="text-xs text-purple-400/70">{account.datasource}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* رسالة توضيحية */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-xs text-blue-300">
                      💡 اسم الحساب يجب أن يتطابق مع الاسم في Windsor.ai لجلب البيانات تلقائياً
                    </p>
                  </div>

                  <button
                    onClick={linkWindsorAccount}
                    disabled={!selectedWindsorAccount.trim()}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-medium hover:from-purple-500 hover:to-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ربط الحساب
                  </button>
                </>
              )}
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

      {/* Edit Store Modal - استخدام القالب الموحد */}
      <AddStoreModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        editingStore={storeData ? {
          id: storeData.id,
          store_name: storeData.store_name,
          store_url: storeData.store_url,
          owner_name: storeData.owner_name,
          owner_phone: storeData.owner_phone,
          owner_email: storeData.owner_email,
          account_manager_id: storeData.account_manager?.id,
          media_buyer_id: storeData.media_buyer?.id,
          priority: storeData.priority as 'high' | 'medium' | 'low',
          status: storeData.status as 'new' | 'active' | 'paused' | 'expired',
          notes: storeData.notes,
          subscription_start_date: storeData.subscription_start_date,
          store_group_url: storeData.store_group_url
        } : null}
      />

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
                <label className="block text-sm text-purple-300 mb-2">الطلبات</label>
                <input
                  type="text"
                  value={dailyUpdateForm.orders}
                  onChange={e => setDailyUpdateForm(prev => ({ ...prev, orders: e.target.value }))}
                  placeholder="أدخل عدد الطلبات"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              {/* العائد ROAS */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">العائد (ROAS)</label>
                <input
                  type="text"
                  value={dailyUpdateForm.roas}
                  onChange={e => setDailyUpdateForm(prev => ({ ...prev, roas: e.target.value }))}
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
  return <StoreDetailsContent />;
}
