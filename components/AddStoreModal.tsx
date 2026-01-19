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

interface StoreFormData {
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  account_manager_id: string;
  priority: 'high' | 'medium' | 'low';
  budget: string;
  notes: string;
  client_id: string;
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
    priority?: 'high' | 'medium' | 'low';
    budget?: string;
    notes?: string;
  } | null;
}

const initialFormData: StoreFormData = {
  store_name: '',
  store_url: '',
  owner_name: '',
  owner_phone: '',
  owner_email: '',
  account_manager_id: '',
  priority: 'medium',
  budget: '',
  notes: '',
  client_id: ''
};

export default function AddStoreModal({ isOpen, onClose, onSuccess, editingStore }: AddStoreModalProps) {
  const [formData, setFormData] = useState<StoreFormData>(initialFormData);
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAccountManagers();
      fetchClients();
      if (editingStore) {
        setFormData({
          store_name: editingStore.store_name || '',
          store_url: editingStore.store_url || '',
          owner_name: editingStore.owner_name || '',
          owner_phone: editingStore.owner_phone || '',
          owner_email: editingStore.owner_email || '',
          account_manager_id: editingStore.account_manager_id || '',
          priority: editingStore.priority || 'medium',
          budget: editingStore.budget || '',
          notes: editingStore.notes || '',
          client_id: (editingStore as any).client_id || ''
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
      console.error('Failed to fetch account managers:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' });
      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
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
      const url = editingStore ? `/api/admin/stores` : '/api/admin/stores';
      const method = editingStore ? 'PUT' : 'POST';
      const body = editingStore ? { id: editingStore.id, ...formData } : formData;

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
      console.error('Failed to save store:', err);
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
              <label className="block text-sm font-medium text-purple-300 mb-1">صاحب المتجر</label>
              <input
                type="text"
                name="owner_name"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">الأولوية *</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
              >
                <option value="high">مرتفع</option>
                <option value="medium">متوسط</option>
                <option value="low">منخفض</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">ميزانية الصرف</label>
              <input
                type="text"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                placeholder="مثال: 5000 ريال"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">العميل (صاحب المتجر)</label>
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
              >
                <option value="">-- اختر العميل --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company_name ? `(${client.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">مدير الحساب المسؤول</label>
              <select
                name="account_manager_id"
                value={formData.account_manager_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
              >
                <option value="">-- اختر مدير الحساب --</option>
                {accountManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({manager.username})
                  </option>
                ))}
              </select>
            </div>
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
