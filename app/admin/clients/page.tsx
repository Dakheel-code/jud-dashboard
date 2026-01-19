'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';

interface Store {
  id: string;
  store_url: string;
  store_name: string | null;
  status: string;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  notes: string | null;
  created_at: string;
  stores: Store[];
}

function ClientsPageContent() {
  const searchParams = useSearchParams();
  const viewClientId = searchParams.get('view');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [availableStores, setAvailableStores] = useState<{id: string; store_name: string; store_url: string}[]>([]);
  const [selectedStoreToLink, setSelectedStoreToLink] = useState('');

  useEffect(() => {
    fetchClients();
    fetchAvailableStores();
  }, []);

  // فتح نافذة العميل تلقائياً إذا تم تمرير معرفه في URL
  useEffect(() => {
    if (viewClientId && clients.length > 0) {
      const client = clients.find(c => c.id === viewClientId);
      if (client) {
        setViewingClient(client);
      }
    }
  }, [viewClientId, clients]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStores = async () => {
    try {
      const response = await fetch('/api/admin/stores');
      const data = await response.json();
      console.log('Available stores:', data.stores);
      setAvailableStores(data.stores || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const handleLinkStore = async (clientId: string, storeId: string) => {
    if (!storeId) return;
    
    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId })
      });

      if (response.ok) {
        const updatedClients = await fetch('/api/admin/clients').then(r => r.json());
        setClients(updatedClients.clients || []);
        // Update editing client with new stores
        const updatedClient = updatedClients.clients?.find((c: Client) => c.id === clientId);
        if (updatedClient) {
          setEditingClient(updatedClient);
        }
        fetchAvailableStores();
        setSelectedStoreToLink('');
        setSuccess('تم ربط المتجر بالعميل بنجاح');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      console.error('Error linking store:', err);
    }
  };

  const handleUnlinkStore = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: null })
      });

      if (response.ok) {
        const updatedClients = await fetch('/api/admin/clients').then(r => r.json());
        setClients(updatedClients.clients || []);
        // Update editing client with new stores
        if (editingClient) {
          const updatedClient = updatedClients.clients?.find((c: Client) => c.id === editingClient.id);
          if (updatedClient) {
            setEditingClient(updatedClient);
          }
        }
        fetchAvailableStores();
      }
    } catch (err) {
      console.error('Error unlinking store:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingClient 
        ? `/api/admin/clients/${editingClient.id}`
        : '/api/admin/clients';
      
      const response = await fetch(url, {
        method: editingClient ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingClient ? 'تم تحديث بيانات العميل بنجاح' : 'تم إضافة العميل بنجاح');
        fetchClients();
        setTimeout(() => {
          setShowAddModal(false);
          setEditingClient(null);
          resetForm();
          setSuccess('');
        }, 1500);
      } else {
        setError(data.error || 'حدث خطأ');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;

    try {
      const response = await fetch(`/api/admin/clients/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchClients();
      }
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company_name: '',
      notes: ''
    });
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company_name: client.company_name || '',
      notes: client.notes || ''
    });
    setShowAddModal(true);
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(searchTerm)) ||
    (client.company_name && client.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20 lg:pb-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain"
            />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                العملاء
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">إدارة بيانات العملاء وأصحاب المتاجر</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setEditingClient(null);
                setShowAddModal(true);
              }}
              className="p-3 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-xl transition-all"
              title="إضافة عميل جديد"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="بحث بالاسم، البريد، الهاتف، أو الشركة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
            <p className="text-purple-300/70 text-xs mb-1">إجمالي العملاء</p>
            <p className="text-2xl font-bold text-white">{clients.length}</p>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
            <p className="text-purple-300/70 text-xs mb-1">إجمالي المتاجر</p>
            <p className="text-2xl font-bold text-white">{clients.reduce((acc, c) => acc + (c.stores?.length || 0), 0)}</p>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
            <p className="text-purple-300/70 text-xs mb-1">عملاء بدون متاجر</p>
            <p className="text-2xl font-bold text-yellow-400">{clients.filter(c => !c.stores || c.stores.length === 0).length}</p>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
            <p className="text-purple-300/70 text-xs mb-1">متوسط المتاجر/عميل</p>
            <p className="text-2xl font-bold text-green-400">
              {clients.length > 0 ? (clients.reduce((acc, c) => acc + (c.stores?.length || 0), 0) / clients.length).toFixed(1) : 0}
            </p>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="p-4 border-b border-purple-500/20">
            <h2 className="text-lg font-semibold text-white">قائمة العملاء ({filteredClients.length})</h2>
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-purple-300/70 mb-4">
                {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد عملاء مسجلين'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
                >
                  إضافة عميل جديد
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-purple-500/20">
              {filteredClients.map((client) => (
                <div key={client.id} className="p-4 hover:bg-purple-900/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 
                            className="font-semibold text-white hover:text-purple-300 cursor-pointer transition-colors"
                            onClick={() => setViewingClient(client)}
                          >
                            {client.name}
                          </h3>
                          {client.company_name && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                              {client.company_name}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-purple-300/70 mb-2">
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {client.phone}
                            </span>
                          )}
                        </div>
                        {/* Stores */}
                        {client.stores && client.stores.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {client.stores.map(store => (
                              <Link
                                key={store.id}
                                href={`/admin/store/${encodeURIComponent(store.store_url)}`}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-900/40 border border-purple-500/20 rounded-xl hover:bg-purple-900/60 hover:border-purple-500/40 transition-all"
                              >
                                <img 
                                  src={`https://www.google.com/s2/favicons?domain=${store.store_url}&sz=64`}
                                  alt={store.store_name || store.store_url}
                                  className="w-8 h-8 rounded-lg object-cover bg-purple-900/50"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/logo.png';
                                  }}
                                />
                                <div className="text-right">
                                  <p className="text-white text-sm font-medium">{store.store_name || store.store_url}</p>
                                  <p className="text-purple-400/60 text-xs">{store.store_url}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {(!client.stores || client.stores.length === 0) && (
                          <span className="text-xs text-yellow-400/70">لا توجد متاجر مرتبطة</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(client)}
                        className="p-2 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-2 text-red-400 border border-red-500/30 hover:border-red-400/50 hover:bg-red-500/10 rounded-lg transition-all"
                        title="حذف"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-950/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-purple-500/20">
              <h2 className="text-xl font-bold text-white">
                {editingClient ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-900/30 border border-green-500/30 rounded-xl text-green-300 text-sm">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm text-purple-300 mb-2">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="اسم العميل"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">اسم الشركة</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="اسم الشركة أو المؤسسة"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none resize-none"
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              {/* Link Stores Section - Only show when editing */}
              {editingClient && (
                <div className="border-t border-purple-500/20 pt-4">
                  <label className="block text-sm text-purple-300 mb-3">ربط متجر بالعميل</label>
                  
                  {/* Current linked stores */}
                  {editingClient.stores && editingClient.stores.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <p className="text-xs text-purple-300/50">المتاجر المرتبطة:</p>
                      {editingClient.stores.map(store => (
                        <div key={store.id} className="flex items-center justify-between p-2 bg-purple-900/30 rounded-lg">
                          <span className="text-white text-sm">{store.store_name || store.store_url}</span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkStore(store.id)}
                            className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            title="فك الربط"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new store link */}
                  <div className="flex gap-2">
                    <select
                      value={selectedStoreToLink}
                      onChange={e => setSelectedStoreToLink(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                    >
                      <option value="">-- اختر متجر للربط --</option>
                      {availableStores
                        .filter(store => !editingClient.stores?.some(s => s.id === store.id))
                        .map(store => (
                          <option key={store.id} value={store.id}>
                            {store.store_name || store.store_url}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleLinkStore(editingClient.id, selectedStoreToLink)}
                      disabled={!selectedStoreToLink}
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-50"
                >
                  {formLoading ? 'جاري الحفظ...' : editingClient ? 'حفظ التغييرات' : 'إضافة العميل'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingClient(null);
                    resetForm();
                    setError('');
                    setSuccess('');
                  }}
                  className="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Client Modal */}
      {viewingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingClient(null)}>
          <div className="bg-purple-950/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-purple-500/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">بيانات العميل</h2>
                <button
                  onClick={() => setViewingClient(null)}
                  className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Client Avatar & Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {viewingClient.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{viewingClient.name}</h3>
                  {viewingClient.company_name && (
                    <p className="text-purple-300/70">{viewingClient.company_name}</p>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-purple-300/70 border-b border-purple-500/20 pb-2">معلومات التواصل</h4>
                {viewingClient.email && (
                  <div className="flex items-center gap-3 p-3 bg-purple-900/30 rounded-xl">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-purple-300/50">البريد الإلكتروني</p>
                      <a href={`mailto:${viewingClient.email}`} className="text-white hover:text-purple-300 transition-colors" dir="ltr">
                        {viewingClient.email}
                      </a>
                    </div>
                  </div>
                )}
                {viewingClient.phone && (
                  <div className="flex items-center gap-3 p-3 bg-purple-900/30 rounded-xl">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-purple-300/50">رقم الهاتف</p>
                      <a href={`tel:${viewingClient.phone}`} className="text-white hover:text-purple-300 transition-colors" dir="ltr">
                        {viewingClient.phone}
                      </a>
                    </div>
                  </div>
                )}
                {!viewingClient.email && !viewingClient.phone && (
                  <p className="text-purple-300/50 text-sm text-center py-4">لا توجد معلومات تواصل</p>
                )}
              </div>

              {/* Notes */}
              {viewingClient.notes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-purple-300/70 border-b border-purple-500/20 pb-2">ملاحظات</h4>
                  <p className="text-white/80 text-sm bg-purple-900/30 p-3 rounded-xl">{viewingClient.notes}</p>
                </div>
              )}

              {/* Stores */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-purple-300/70 border-b border-purple-500/20 pb-2">
                  المتاجر ({viewingClient.stores?.length || 0})
                </h4>
                {viewingClient.stores && viewingClient.stores.length > 0 ? (
                  <div className="space-y-2">
                    {viewingClient.stores.map(store => (
                      <Link
                        key={store.id}
                        href={`/admin/store/${encodeURIComponent(store.store_url)}`}
                        className="flex items-center gap-3 p-3 bg-purple-900/30 rounded-xl hover:bg-purple-900/50 transition-colors flex-row-reverse"
                        onClick={() => setViewingClient(null)}
                      >
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-white font-medium">{store.store_name || store.store_url}</p>
                          <p className="text-purple-300/50 text-xs">{store.store_url}</p>
                        </div>
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-purple-300/50 text-sm text-center py-4">لا توجد متاجر مرتبطة</p>
                )}
              </div>

              {/* Created Date */}
              <div className="text-center text-purple-300/50 text-xs pt-4 border-t border-purple-500/20">
                تاريخ الإضافة: {new Date(viewingClient.created_at).toLocaleDateString('en-US')}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setViewingClient(null);
                    openEditModal(viewingClient);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  تعديل البيانات
                </button>
                <button
                  onClick={() => setViewingClient(null)}
                  className="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <AdminAuth>
      <ClientsPageContent />
    </AdminAuth>
  );
}
