'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';

interface SlackWebhook {
  id: string;
  name: string;
  webhook_url: string;
  channel_name: string | null;
  is_active: boolean;
  notify_new_store: boolean;
  notify_store_complete: boolean;
  notify_milestone: boolean;
  created_at: string;
}

function SettingsPageContent() {
  const [webhooks, setWebhooks] = useState<SlackWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<SlackWebhook | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    channel_name: '',
    notify_new_store: true,
    notify_store_complete: true,
    notify_milestone: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/admin/slack');
      const data = await response.json();
      setWebhooks(data.webhooks || []);
    } catch (err) {
      console.error('Error fetching webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = '/api/admin/slack';
      const method = editingWebhook ? 'PUT' : 'POST';
      const body = editingWebhook ? { id: editingWebhook.id, ...formData } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'حدث خطأ');
        return;
      }

      setSuccess(data.message);
      setShowAddModal(false);
      setEditingWebhook(null);
      resetForm();
      fetchWebhooks();
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الربط؟')) return;

    try {
      const response = await fetch(`/api/admin/slack?id=${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setSuccess('تم الحذف بنجاح');
      fetchWebhooks();
    } catch (err) {
      setError('حدث خطأ في الحذف');
    }
  };

  const handleToggleActive = async (webhook: SlackWebhook) => {
    try {
      const response = await fetch('/api/admin/slack', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: webhook.id, is_active: !webhook.is_active }),
      });

      if (response.ok) {
        fetchWebhooks();
      }
    } catch (err) {
      console.error('Error toggling webhook:', err);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingWebhook(webhookId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/slack/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          data: {},
          webhook_id: webhookId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('تم إرسال رسالة الاختبار بنجاح! تحقق من قناة Slack.');
      } else {
        setError('فشل في إرسال رسالة الاختبار');
      }
    } catch (err) {
      setError('حدث خطأ في الاختبار');
    } finally {
      setTestingWebhook(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      webhook_url: '',
      channel_name: '',
      notify_new_store: true,
      notify_store_complete: true,
      notify_milestone: true,
    });
  };

  const openEditModal = (webhook: SlackWebhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      webhook_url: webhook.webhook_url,
      channel_name: webhook.channel_name || '',
      notify_new_store: webhook.notify_new_store,
      notify_store_complete: webhook.notify_store_complete,
      notify_milestone: webhook.notify_milestone,
    });
    setShowAddModal(true);
  };

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

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
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
              <h1 className="text-xl sm:text-3xl text-white mb-1" style={{ fontFamily: "'Suisse Intl', var(--font-cairo), sans-serif", fontWeight: 600 }}>
                إعدادات الربط
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">ربط الإشعارات مع Slack</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setEditingWebhook(null);
                setShowAddModal(true);
              }}
              className="p-3 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-xl transition-all"
              title="إضافة ربط جديد"
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

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-900/30 border border-green-500/30 rounded-xl text-green-300">
            {success}
          </div>
        )}

        {/* Slack Info */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#4A154B] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">ربط Slack</h3>
              <p className="text-purple-300/70 text-sm mb-3">
                اربط قنوات Slack لتلقي إشعارات فورية عند تسجيل متاجر جديدة، إكمال المهام، أو طلبات المساعدة.
              </p>
              <a 
                href="https://api.slack.com/apps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm inline-flex items-center gap-1"
              >
                إنشاء Slack App
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Webhooks List */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="p-4 border-b border-purple-500/20">
            <h2 className="text-lg font-semibold text-white">قنوات Slack المربوطة</h2>
          </div>

          {webhooks.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-purple-300/70 mb-4">لا توجد قنوات مربوطة</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
              >
                إضافة ربط جديد
              </button>
            </div>
          ) : (
            <div className="divide-y divide-purple-500/20">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4 hover:bg-purple-900/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white">{webhook.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          webhook.is_active 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {webhook.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      {webhook.channel_name && (
                        <p className="text-purple-300/70 text-sm mb-2">#{webhook.channel_name}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {webhook.notify_new_store && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg">متجر جديد</span>
                        )}
                        {webhook.notify_store_complete && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg">إكمال 100%</span>
                        )}
                        {webhook.notify_milestone && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg">مراحل</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestWebhook(webhook.id)}
                        disabled={testingWebhook === webhook.id || !webhook.is_active}
                        className="p-2 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-lg transition-all disabled:opacity-50"
                        title="اختبار"
                      >
                        {testingWebhook === webhook.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleActive(webhook)}
                        className={`p-2 border rounded-lg transition-all ${
                          webhook.is_active
                            ? 'text-yellow-400 border-yellow-500/30 hover:border-yellow-400/50 hover:bg-yellow-500/10'
                            : 'text-green-400 border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10'
                        }`}
                        title={webhook.is_active ? 'تعطيل' : 'تفعيل'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {webhook.is_active ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(webhook)}
                        className="p-2 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(webhook.id)}
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
          <div className="bg-purple-950/95 backdrop-blur-xl rounded-2xl p-6 max-w-lg w-full border border-purple-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-6">
              {editingWebhook ? 'تعديل الربط' : 'إضافة ربط جديد'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-purple-300 text-sm mb-2">اسم الربط *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                  placeholder="مثال: إشعارات المتاجر"
                  required
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2">Webhook URL *</label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 text-left dir-ltr"
                  placeholder="https://hooks.slack.com/services/..."
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2">اسم القناة (اختياري)</label>
                <input
                  type="text"
                  value={formData.channel_name}
                  onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                  placeholder="مثال: bootcamp-notifications"
                />
              </div>

              <div className="border-t border-purple-500/20 pt-4">
                <label className="block text-purple-300 text-sm mb-3">أنواع الإشعارات</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notify_new_store}
                      onChange={(e) => setFormData({ ...formData, notify_new_store: e.target.checked })}
                      className="w-5 h-5 rounded border-purple-500/30 bg-purple-900/30 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-white">متجر جديد سجّل في النظام</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notify_store_complete}
                      onChange={(e) => setFormData({ ...formData, notify_store_complete: e.target.checked })}
                      className="w-5 h-5 rounded border-purple-500/30 bg-purple-900/30 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-white">متجر أكمل 100% من المهام</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notify_milestone}
                      onChange={(e) => setFormData({ ...formData, notify_milestone: e.target.checked })}
                      className="w-5 h-5 rounded border-purple-500/30 bg-purple-900/30 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-white">متجر وصل لمرحلة 50%</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold rounded-xl transition-all"
                >
                  {editingWebhook ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingWebhook(null);
                    resetForm();
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
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AdminAuth>
      <SettingsPageContent />
    </AdminAuth>
  );
}
