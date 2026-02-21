'use client';

import { useState, useEffect } from 'react';

interface AccountManager {
  id: string;
  name: string;
  username: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
}

const BILLING_PACKAGES = [
  { label: '10K – 19K', amount: 3200 },
  { label: '20K – 49K', amount: 3700 },
  { label: '50K – 99K', amount: 4800 },
  { label: '100K – 299K', amount: 5800 },
];

interface StoreFormData {
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  account_manager_id: string;
  media_buyer_id: string;
  priority: 'high' | 'medium' | 'low';
  status: 'new' | 'active' | 'paused' | 'expired';
  category: string;
  budget: string;
  notes: string;
  client_id: string;
  subscription_start_date: string;
  store_group_url: string;
  billing_type: 'package' | 'custom' | '';
  billing_amount: string;
}


interface MediaBuyer {
  id: string;
  name: string;
}

interface AddStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStore?: {
    id: string;
    store_name?: string;
    store_url: string;
    owner_name?: string;
    owner_phone?: string;
    owner_email?: string;
    account_manager_id?: string;
    media_buyer_id?: string;
    priority?: 'high' | 'medium' | 'low';
    status?: 'new' | 'active' | 'paused' | 'expired';
    budget?: string;
    notes?: string;
    subscription_start_date?: string;
    store_group_url?: string;
    category?: string;
    billing_type?: string;
    billing_amount?: number | null;
  } | null;
}

const initialFormData: StoreFormData = {
  store_name: '',
  store_url: '',
  owner_name: '',
  owner_phone: '',
  owner_email: '',
  account_manager_id: '',
  media_buyer_id: '',
  priority: 'medium',
  status: 'new',
  category: '',
  budget: '',
  notes: '',
  client_id: '',
  subscription_start_date: '',
  store_group_url: '',
  billing_type: '',
  billing_amount: '',
};

export default function AddStoreModal({ isOpen, onClose, onSuccess, editingStore }: AddStoreModalProps) {
  const [formData, setFormData] = useState<StoreFormData>(initialFormData);
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([]);
  const [mediaBuyers, setMediaBuyers] = useState<MediaBuyer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [storeCategories, setStoreCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAccountManagers();
      fetchMediaBuyers();
      fetchClients();
      fetchStoreCategories();
      if (editingStore) {
        setFormData({
          store_name: editingStore.store_name || '',
          store_url: editingStore.store_url || '',
          owner_name: editingStore.owner_name || '',
          owner_phone: editingStore.owner_phone || '',
          owner_email: editingStore.owner_email || '',
          account_manager_id: editingStore.account_manager_id || '',
          media_buyer_id: editingStore.media_buyer_id || '',
          priority: editingStore.priority || 'medium',
          status: editingStore.status || 'new',
          category: editingStore.category || '',
          budget: editingStore.budget || '',
          notes: editingStore.notes || '',
          client_id: (editingStore as any).client_id || '',
          subscription_start_date: editingStore.subscription_start_date || '',
          store_group_url: editingStore.store_group_url || '',
          billing_type: (editingStore.billing_type as any) || '',
          billing_amount: editingStore.billing_amount != null ? String(editingStore.billing_amount) : '',
        });
      } else {
        setFormData(initialFormData);
      }
      setError('');
    }
  }, [isOpen, editingStore]);

  const fetchAccountManagers = async () => {
    try {
      const response = await fetch('/api/admin/account-managers', { cache: 'no-store' });
      const data = await response.json();
      setAccountManagers(data.managers || []);
    } catch (err) {
    }
  };

  const fetchMediaBuyers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      const buyers = (data.users || []).filter((user: any) => 
        user.roles?.includes('media_buyer') || user.role === 'media_buyer'
      );
      setMediaBuyers(buyers.map((u: any) => ({ id: u.id, name: u.name })));
    } catch (err) {
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' });
      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
    }
  };

  const fetchStoreCategories = async () => {
    try {
      const response = await fetch('/api/admin/settings/store-categories');
      const data = await response.json();
      setStoreCategories(data.categories || []);
    } catch (err) {
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      const url = editingStore ? `/api/admin/stores/${editingStore.id}` : '/api/admin/stores';
      const method = editingStore ? 'PUT' : 'POST';
      const billingAmount = formData.billing_amount !== '' ? Number(formData.billing_amount) : null;
      const billingType = formData.billing_type || null;
      const body = editingStore
        ? {
            ...formData,
            billing_type: billingType,
            billing_amount: billingAmount,
          }
        : {
            ...formData,
            billing_type: billingType,
            billing_amount: billingAmount,
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
        setFormData(initialFormData);
      } else {
        setError(data.error || (editingStore ? 'فشل تحديث المتجر' : 'فشل إضافة المتجر'));
      }
    } catch (err) {
      setError('حدث خطأ أثناء حفظ المتجر');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {editingStore ? 'تعديل بيانات المتجر' : 'إضافة متجر جديد'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">اسم المتجر *</label>
              <input
                type="text"
                name="store_name"
                required
                value={formData.store_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                placeholder="مثال: متجر الأناقة"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">رابط المتجر *</label>
              <input
                type="text"
                name="store_url"
                required
                value={formData.store_url}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                placeholder="example.com"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">صاحب المتجر *</label>
              <input
                type="text"
                name="owner_name"
                required
                value={formData.owner_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                placeholder="اسم صاحب المتجر"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">رقم الجوال *</label>
              <input
                type="tel"
                name="owner_phone"
                required
                value={formData.owner_phone}
                onChange={(e) => setFormData({...formData, owner_phone: e.target.value.replace(/\s/g, '')})}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                name="owner_email"
                value={formData.owner_email}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">تصنيف المتجر</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none [&>option]:bg-[#1a0a2e]"
              >
                <option value="" className="bg-[#1a0a2e]">-- اختر التصنيف --</option>
                {storeCategories.map((cat: string) => (
                  <option key={cat} value={cat} className="bg-[#1a0a2e]">{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">الأولوية</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none [&>option]:bg-[#1a0a2e]"
              >
                <option value="high" className="bg-[#1a0a2e]">مرتفع</option>
                <option value="medium" className="bg-[#1a0a2e]">متوسط</option>
                <option value="low" className="bg-[#1a0a2e]">منخفض</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">الحالة</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none [&>option]:bg-[#1a0a2e]"
              >
                <option value="new" className="bg-[#1a0a2e]">جديد</option>
                <option value="active" className="bg-[#1a0a2e]">نشط</option>
                <option value="paused" className="bg-[#1a0a2e]">متوقف</option>
                <option value="expired" className="bg-[#1a0a2e]">منتهي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">مدير الحساب</label>
              <select
                name="account_manager_id"
                value={formData.account_manager_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none [&>option]:bg-[#1a0a2e]"
              >
                <option value="" className="bg-[#1a0a2e]">غير محدد</option>
                {accountManagers.map((manager) => (
                  <option key={manager.id} value={manager.id} className="bg-[#1a0a2e]">
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">ميديا باير</label>
              <select
                name="media_buyer_id"
                value={formData.media_buyer_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none [&>option]:bg-[#1a0a2e]"
              >
                <option value="" className="bg-[#1a0a2e]">غير محدد</option>
                {mediaBuyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id} className="bg-[#1a0a2e]">
                    {buyer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">تاريخ بداية الاشتراك</label>
            <div className="relative" dir="ltr" lang="en-US">
              <input
                type="date"
                name="subscription_start_date"
                value={formData.subscription_start_date ? formData.subscription_start_date.split('T')[0] : ''}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert ${!formData.subscription_start_date ? 'text-transparent' : ''}`}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                lang="en-US"
              />
              {!formData.subscription_start_date && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400/70 pointer-events-none text-sm" dir="rtl">تاريخ بداية اطلاق اول حملة</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">رابط قناة التواصل</label>
            <input
              type="url"
              name="store_group_url"
              value={formData.store_group_url}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
              placeholder="https://chat.whatsapp.com/..."
              dir="ltr"
            />
          </div>

          {/* ═══ قسم الفوترة ═══ */}
          <div className="border border-amber-500/20 rounded-xl p-4 bg-amber-500/5 space-y-3">
            <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              الفوترة الشهرية
            </p>

            <div className="flex gap-1.5 flex-wrap">
              {BILLING_PACKAGES.map((pkg) => {
                const isSelected = formData.billing_type === 'package' && formData.billing_amount === String(pkg.amount);
                return (
                  <button
                    key={pkg.label}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      billing_type: 'package',
                      billing_amount: String(pkg.amount),
                    }))}
                    className={`flex-1 min-w-[calc(25%-6px)] px-2 py-1.5 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400/70 text-amber-300'
                        : 'bg-purple-900/20 border-purple-500/20 text-purple-400 hover:border-amber-500/30 hover:text-amber-300/80'
                    }`}
                  >
                    <span className="block text-[10px] leading-tight opacity-60">{pkg.label}</span>
                    <span className="block text-xs font-bold leading-tight">{pkg.amount.toLocaleString('ar-SA')}</span>
                    <span className="block text-[9px] opacity-50">ر.س</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-purple-500/20" />
              <span className="text-purple-400/50 text-xs">أو كتابة يدوية</span>
              <div className="flex-1 h-px bg-purple-500/20" />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="مبلغ مخصص..."
                value={formData.billing_type === 'custom' ? formData.billing_amount : ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  billing_type: 'custom',
                  billing_amount: e.target.value,
                }))}
                className="flex-1 px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-400 outline-none"
                dir="ltr"
              />
              <span className="text-purple-400 text-sm whitespace-nowrap">ر.س / شهر</span>
              {formData.billing_amount && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, billing_type: '', billing_amount: '' }))}
                  className="p-2 text-purple-400/50 hover:text-red-400 transition-colors"
                  title="مسح"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {formData.billing_amount && (
              <p className="text-amber-400/70 text-xs text-center">
                المبلغ المحدد: <span className="font-bold text-amber-300">{Number(formData.billing_amount).toLocaleString('ar-SA')} ر.س / شهر</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">ملاحظات</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none resize-none"
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {editingStore ? 'جاري التحديث...' : 'جاري الإضافة...'}
                </span>
              ) : (editingStore ? 'تحديث المتجر' : 'إضافة المتجر')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 rounded-xl font-semibold transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
