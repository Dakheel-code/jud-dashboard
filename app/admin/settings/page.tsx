'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [adAccounts, setAdAccounts] = useState<string[]>([]);
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
  const [newAdEmail, setNewAdEmail] = useState('');
  const [savingAdAccounts, setSavingAdAccounts] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [whatsappTemplates, setWhatsappTemplates] = useState<{[key: string]: {name: string; content: string; linkedButton?: string}}>({
    daily_update: { name: 'التحديث اليومي', content: 'مرحباً {store_name}،\n\nالتحديث اليومي:\n📊 المبيعات: {sales}\n💰 العائد: {revenue}\n💸 الصرف: {spend}\n\nشكراً لتعاونكم', linkedButton: 'daily_update' }
  });
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({ key: '', name: '', content: '', linkedButton: '' });
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (prefix: string, suffix: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateForm.content;
    const selectedText = text.substring(start, end);
    const scrollTop = textarea.scrollTop;
    
    if (selectedText) {
      const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      setTemplateForm(prev => ({ ...prev, content: newText }));
      setTimeout(() => {
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        textarea.scrollTop = scrollTop;
      }, 0);
    } else {
      const newText = text.substring(0, start) + prefix + suffix + text.substring(end);
      setTemplateForm(prev => ({ ...prev, content: newText }));
      setTimeout(() => {
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        textarea.scrollTop = scrollTop;
      }, 0);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateForm.content;
    const scrollTop = textarea.scrollTop;
    
    const newText = text.substring(0, start) + variable + text.substring(end);
    setTemplateForm(prev => ({ ...prev, content: newText }));
    
    setTimeout(() => {
      textarea.focus({ preventScroll: true });
      const newCursorPos = start + variable.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.scrollTop = scrollTop;
    }, 0);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const text = templateForm.content;
      
      // البحث عن بداية السطر الحالي
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const currentLine = text.substring(lineStart, start);
      
      // التحقق من نمط الترقيم أو التنقيط
      const bulletMatch = currentLine.match(/^(•\s*)/);
      const numberMatch = currentLine.match(/^(\d+)\.\s*/);
      
      // إذا كان السطر فارغ (فقط الترقيم) - أوقف الترقيم
      const lineContent = currentLine.replace(/^(•\s*|\d+\.\s*)/, '').trim();
      
      if (bulletMatch && lineContent === '') {
        // إزالة النقطة من السطر الفارغ
        e.preventDefault();
        const newText = text.substring(0, lineStart) + text.substring(start);
        setTemplateForm(prev => ({ ...prev, content: newText }));
        setTimeout(() => {
          textarea.setSelectionRange(lineStart, lineStart);
        }, 0);
        return;
      }
      
      if (numberMatch && lineContent === '') {
        // إزالة الرقم من السطر الفارغ
        e.preventDefault();
        const newText = text.substring(0, lineStart) + text.substring(start);
        setTemplateForm(prev => ({ ...prev, content: newText }));
        setTimeout(() => {
          textarea.setSelectionRange(lineStart, lineStart);
        }, 0);
        return;
      }
      
      if (bulletMatch) {
        // إضافة نقطة جديدة
        e.preventDefault();
        const newText = text.substring(0, start) + '\n• ' + text.substring(start);
        setTemplateForm(prev => ({ ...prev, content: newText }));
        setTimeout(() => {
          const newPos = start + 3;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }
      
      if (numberMatch) {
        // إضافة رقم جديد
        e.preventDefault();
        const nextNum = parseInt(numberMatch[1]) + 1;
        const newText = text.substring(0, start) + '\n' + nextNum + '. ' + text.substring(start);
        setTemplateForm(prev => ({ ...prev, content: newText }));
        setTimeout(() => {
          const newPos = start + 2 + nextNum.toString().length + 1;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }
    }
  };

  useEffect(() => {
    fetchWebhooks();
    fetchAdAccounts();
    fetchWhatsappTemplates();
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

  const fetchAdAccounts = async () => {
    try {
      const response = await fetch('/api/admin/ad-accounts');
      const data = await response.json();
      setAdAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error fetching ad accounts:', err);
    }
  };

  const fetchWhatsappTemplates = async () => {
    try {
      const response = await fetch('/api/admin/settings/whatsapp-templates');
      const data = await response.json();
      if (data.templates) {
        setWhatsappTemplates(data.templates);
      }
    } catch (err) {
      console.error('Error fetching whatsapp templates:', err);
    }
  };

  const saveWhatsappTemplates = async (templatesToSave?: typeof whatsappTemplates) => {
    setSavingTemplates(true);
    try {
      const response = await fetch('/api/admin/settings/whatsapp-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: templatesToSave || whatsappTemplates })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('تم حفظ قوالب الرسائل بنجاح');
        setTimeout(() => setSuccess(''), 3000);
        return true;
      } else {
        console.error('Save failed:', data);
        setError(data.error || 'فشل في حفظ قوالب الرسائل');
        setTimeout(() => setError(''), 3000);
        return false;
      }
    } catch (err) {
      console.error('Error saving whatsapp templates:', err);
      setError('فشل في حفظ قوالب الرسائل');
      setTimeout(() => setError(''), 3000);
      return false;
    } finally {
      setSavingTemplates(false);
    }
  };

  const openEditTemplateModal = (key: string) => {
    const template = whatsappTemplates[key];
    setEditingTemplate(key);
    setTemplateForm({ 
      key, 
      name: template?.name || '', 
      content: template?.content || '',
      linkedButton: template?.linkedButton || ''
    });
    setShowTemplateModal(true);
  };

  const openAddTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({ key: '', name: '', content: '', linkedButton: '' });
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      setError('يرجى ملء جميع الحقول');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const key = editingTemplate || templateForm.key.trim().toLowerCase().replace(/\s+/g, '_') || `template_${Date.now()}`;
    const updatedTemplates = {
      ...whatsappTemplates,
      [key]: { name: templateForm.name, content: templateForm.content, linkedButton: templateForm.linkedButton }
    };
    
    setWhatsappTemplates(updatedTemplates);
    await saveWhatsappTemplates(updatedTemplates);
    setShowTemplateModal(false);
    setTemplateForm({ key: '', name: '', content: '', linkedButton: '' });
    setEditingTemplate(null);
  };

  const deleteTemplate = async (key: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;
    
    const updatedTemplates = { ...whatsappTemplates };
    delete updatedTemplates[key];
    
    setWhatsappTemplates(updatedTemplates);
    await saveWhatsappTemplates(updatedTemplates);
  };

  const addAdAccount = async () => {
    if (!newAdEmail.trim()) return;
    
    const updatedAccounts = [...adAccounts, newAdEmail.trim()];
    setSavingAdAccounts(true);
    
    try {
      const response = await fetch('/api/admin/ad-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: updatedAccounts })
      });
      
      if (response.ok) {
        setAdAccounts(updatedAccounts);
        setNewAdEmail('');
        setSuccess('تم إضافة الحساب بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error saving ad account:', err);
      setError('فشل في حفظ الحساب');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingAdAccounts(false);
    }
  };

  const removeAdAccount = async (index: number) => {
    const updatedAccounts = adAccounts.filter((_, i) => i !== index);
    setSavingAdAccounts(true);
    
    try {
      const response = await fetch('/api/admin/ad-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: updatedAccounts })
      });
      
      if (response.ok) {
        setAdAccounts(updatedAccounts);
        setSuccess('تم حذف الحساب بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error removing ad account:', err);
    } finally {
      setSavingAdAccounts(false);
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
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                إعدادات عامة
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">إدارة الحسابات الإعلانية وربط الإشعارات</p>
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

        {/* Ad Accounts Section */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">الحسابات الإعلانية</h3>
              <p className="text-purple-300/70 text-sm mb-4">
                أضف إيميلات الحسابات الإعلانية لاستخدامها في المتاجر.
              </p>
              
              {/* Add New Account */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="email"
                  placeholder="أدخل الإيميل..."
                  value={newAdEmail}
                  onChange={(e) => setNewAdEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none placeholder-purple-400/50"
                />
                <button
                  onClick={addAdAccount}
                  disabled={savingAdAccounts || !newAdEmail.trim()}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-xl transition-colors"
                >
                  {savingAdAccounts ? 'جاري الحفظ...' : 'إضافة'}
                </button>
              </div>

              {/* Accounts List */}
              {adAccounts.length > 0 ? (
                <div className="space-y-2">
                  {adAccounts.map((email, index) => (
                    <div key={index} className="flex items-center justify-between bg-purple-900/30 rounded-xl p-3 border border-purple-500/20">
                      <span className="text-white">{email}</span>
                      <button
                        onClick={() => removeAdAccount(index)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-purple-300/50 text-sm text-center py-4">لا توجد حسابات مضافة</p>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp Templates Section */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">رسائل الواتساب المخصصة</h3>
                <button
                  onClick={openAddTemplateModal}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة قالب
                </button>
              </div>
              <p className="text-purple-300/70 text-sm mb-4">
                قم بتخصيص قوالب الرسائل التي يتم إرسالها عبر الواتساب. استخدم المتغيرات التالية:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{store_name}'}</span>
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{owner_name}'}</span>
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{account_manager}'}</span>
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{sales}'}</span>
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{revenue}'}</span>
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{spend}'}</span>
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{day}'}</span>
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{date}'}</span>
                <span className="px-2 py-1 bg-purple-900/50 rounded-lg text-xs text-purple-300">{'{store_url}'}</span>
              </div>
              
              {/* Templates List */}
              <div className="space-y-3">
                {Object.entries(whatsappTemplates).map(([key, template]) => (
                  <div key={key} className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">{template.name}</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditTemplateModal(key)}
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteTemplate(key)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-purple-300/70 text-sm whitespace-pre-wrap line-clamp-3">{template.content}</p>
                  </div>
                ))}
                {Object.keys(whatsappTemplates).length === 0 && (
                  <p className="text-purple-300/50 text-sm text-center py-4">لا توجد قوالب مضافة</p>
                )}
              </div>
            </div>
          </div>
        </div>

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

      {/* Template Edit/Add Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingTemplate ? 'تعديل القالب' : 'إضافة قالب جديد'}
              </h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  setTemplateForm({ key: '', name: '', content: '', linkedButton: '' });
                }}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-purple-300 mb-2">اسم القالب</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: التحديث اليومي"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">ربط مع زر</label>
                <select
                  value={templateForm.linkedButton}
                  onChange={e => setTemplateForm(prev => ({ ...prev, linkedButton: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                >
                  <option value="">-- بدون ربط --</option>
                  <option value="daily_update">التحديث اليومي (صفحة المتجر)</option>
                </select>
                <p className="text-xs text-purple-400/70 mt-1">اختر الزر الذي سيستخدم هذا القالب</p>
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-2">محتوى الرسالة</label>
                
                {/* أزرار تنسيق الواتساب */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => applyFormatting('*', '*')}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-sm text-white font-bold transition-colors"
                    title="خط عريض - حدد النص ثم اضغط"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('_', '_')}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-sm text-white italic transition-colors"
                    title="خط مائل - حدد النص ثم اضغط"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('~', '~')}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-sm text-white line-through transition-colors"
                    title="يتوسطه خط - حدد النص ثم اضغط"
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('```', '```')}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-sm text-white font-mono transition-colors"
                    title="كود - حدد النص ثم اضغط"
                  >
                    {'</>'}
                  </button>
                  <div className="h-6 w-px bg-purple-500/30 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => applyFormatting('> ', '')}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-sm text-purple-300 transition-colors"
                    title="اقتباس - حدد النص ثم اضغط"
                  >
                    ❝
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('• ', '')}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-sm text-purple-300 transition-colors"
                    title="قائمة نقطية - حدد النص ثم اضغط"
                  >
                    ☰
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('1. ', '')}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-sm text-purple-300 transition-colors"
                    title="قائمة رقمية - حدد النص ثم اضغط"
                  >
                    1.
                  </button>
                  <div className="h-6 w-px bg-purple-500/30 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => applyFormatting('\n', '')}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-xs text-purple-300 transition-colors"
                    title="سطر جديد"
                  >
                    ↵ سطر جديد
                  </button>
                </div>
                
                <textarea
                  ref={templateTextareaRef}
                  value={templateForm.content}
                  onChange={e => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                  onKeyDown={handleTextareaKeyDown}
                  rows={8}
                  placeholder="أدخل محتوى الرسالة..."
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none resize-y min-h-[150px] font-mono"
                  dir="rtl"
                />
                
                {/* معاينة الرسالة - محاكاة واتساب */}
                {templateForm.content && (
                  <div className="mt-3">
                    <p className="text-xs text-purple-400 mb-2">معاينة الرسالة:</p>
                    <div className="bg-[#0b141a] rounded-xl p-4 max-w-md">
                      {/* فقاعة الرسالة */}
                      <div className="relative bg-[#005c4b] rounded-lg rounded-tr-none p-3 shadow-md">
                        {/* مثلث الفقاعة */}
                        <div className="absolute -top-0 -right-2 w-0 h-0 border-l-8 border-l-[#005c4b] border-t-8 border-t-transparent border-b-8 border-b-transparent"></div>
                        
                        {/* محتوى الرسالة */}
                        <div 
                          className="text-white text-sm whitespace-pre-wrap leading-relaxed"
                          dir="rtl"
                          dangerouslySetInnerHTML={{
                            __html: templateForm.content
                              .replace(/\{store_name\}/g, 'متجر النجاح')
                              .replace(/\{owner_name\}/g, 'أحمد محمد')
                              .replace(/\{account_manager\}/g, 'سارة أحمد')
                              .replace(/\{sales\}/g, '150')
                              .replace(/\{revenue\}/g, '12,500 ر.س')
                              .replace(/\{spend\}/g, '3,200 ر.س')
                              .replace(/\{day\}/g, 'الإثنين')
                              .replace(/\{date\}/g, new Date().toLocaleDateString('en-US'))
                              .replace(/\{store_url\}/g, 'store.example.com')
                              .replace(/```([\s\S]*?)```/g, '<code class="block bg-[#1d3c34] px-2 py-1 rounded font-mono text-xs my-1 whitespace-pre-wrap">$1</code>')
                              .replace(/(^> .+\n?)+/gm, (match) => {
                                const lines = match.trim().split('\n').map(l => l.replace(/^> /, '')).join('<br/>');
                                return `<div class="border-r-4 border-[#53bdeb] pr-3 mr-1 text-[#ffffffcc]">${lines}</div>`;
                              })
                              .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
                              .replace(/_([^_]+)_/g, '<em>$1</em>')
                              .replace(/~([^~]+)~/g, '<del>$1</del>')
                          }}
                        />
                        
                        {/* وقت الرسالة وعلامة القراءة */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-[#ffffff99]">
                            {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <svg className="w-4 h-4 text-[#53bdeb]" viewBox="0 0 16 11" fill="currentColor">
                            <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.136.475.475 0 0 0-.347.147.473.473 0 0 0 .002.692l2.764 2.612a.478.478 0 0 0 .322.122h.039a.512.512 0 0 0 .351-.176l6.556-8.09a.477.477 0 0 0-.071-.611z"/>
                            <path d="M14.921.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.028-.971a.457.457 0 0 0-.068.611l.387.366a.478.478 0 0 0 .322.122h.039a.512.512 0 0 0 .351-.176l6.556-8.09a.477.477 0 0 0-.071-.611z" opacity=".5"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                </div>

              <div className="bg-purple-900/20 rounded-lg p-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-purple-400 ml-1">المتغيرات:</span>
                  {['{store_name}', '{owner_name}', '{account_manager}', '{sales}', '{revenue}', '{spend}', '{day}', '{date}', '{store_url}'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-1.5 py-0.5 bg-purple-900/50 hover:bg-purple-800/50 rounded text-[10px] text-purple-300 transition-colors"
                    >
                      {v.replace(/[{}]/g, '')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveTemplate}
                  disabled={savingTemplates}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-medium hover:from-green-500 hover:to-green-400 transition-all disabled:opacity-50"
                >
                  {savingTemplates ? 'جاري الحفظ...' : 'حفظ القالب'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                    setTemplateForm({ key: '', name: '', content: '', linkedButton: '' });
                  }}
                  className="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
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
