'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HelpRequest } from '@/types';
import Modal from '@/components/ui/Modal';
import AdminAuth from '@/components/AdminAuth';
import AdminBottomNav from '@/components/AdminBottomNav';

function HelpRequestsContent() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [viewConversation, setViewConversation] = useState<string | null>(null);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/help');
      const data = await response.json();
      setRequests(data.requests || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch help requests:', err);
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedRequest || !replyText.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/admin/help', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRequest.id, reply: replyText })
      });

      const data = await response.json();
      console.log('Reply response:', data);

      if (response.ok && data.success) {
        await fetchRequests();
        setSelectedRequest(null);
        setReplyText('');
        setResultModalType('success');
        setResultModalMessage('تم إرسال الرد بنجاح!');
        setShowResultModal(true);
      } else {
        setResultModalType('error');
        setResultModalMessage(data.error || 'فشل إرسال الرد');
        setShowResultModal(true);
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      setResultModalType('error');
      setResultModalMessage('فشل إرسال الرد');
      setShowResultModal(true);
    } finally {
      setSending(false);
    }
  };

  const openDeleteModal = (id: string) => {
    setRequestToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!requestToDelete) return;
    setShowDeleteModal(false);

    try {
      const response = await fetch(`/api/admin/help?id=${requestToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchRequests();
        setResultModalType('success');
        setResultModalMessage('تم حذف الطلب بنجاح!');
      } else {
        setResultModalType('error');
        setResultModalMessage('فشل حذف الطلب.');
      }
    } catch (err) {
      console.error('Failed to delete request:', err);
      setResultModalType('error');
      setResultModalMessage('حدث خطأ أثناء حذف الطلب.');
    } finally {
      setRequestToDelete(null);
      setShowResultModal(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">قيد الانتظار</span>;
      case 'replied':
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">تم الرد</span>;
      case 'closed':
        return <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">مغلق</span>;
      default:
        return null;
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
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
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
              <h1 className="text-xl sm:text-3xl font-bold text-white mb-1">
                طلبات المساعدة
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">الرد على استفسارات المتاجر</p>
            </div>
          </div>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-purple-500/20">
            <div className="text-xl sm:text-3xl font-bold text-white mb-1">{requests.length}</div>
            <div className="text-purple-300/80 text-xs sm:text-sm">إجمالي الطلبات</div>
          </div>
          <div className="bg-yellow-950/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-yellow-500/20">
            <div className="text-xl sm:text-3xl font-bold text-yellow-400 mb-1">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-yellow-300/80 text-xs sm:text-sm">قيد الانتظار</div>
          </div>
          <div className="bg-green-950/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-green-500/20">
            <div className="text-xl sm:text-3xl font-bold text-green-400 mb-1">
              {requests.filter(r => r.status === 'replied').length}
            </div>
            <div className="text-green-300/80 text-xs sm:text-sm">تم الرد</div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 border border-purple-500/20 overflow-hidden">
          <div className="p-6 border-b border-purple-500/20">
            <h2 className="text-xl font-bold text-white">جميع الطلبات</h2>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center text-purple-300/60">
              لا توجد طلبات مساعدة حالياً
            </div>
          ) : (
            <div className="divide-y divide-purple-500/20">
              {requests.map((request) => {
                // جمع جميع الرسائل المرتبطة بنفس المتجر
                const relatedMessages = requests.filter(
                  r => r.store_id === request.store_id
                ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                
                const isExpanded = viewConversation === request.store_id;
                const hasMultipleMessages = relatedMessages.length > 1;

                return (
                  <div key={request.id} className="p-6 hover:bg-purple-900/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(request.status)}
                          <span className="text-purple-300 text-sm">
                            {request.store_url || 'متجر غير معروف'}
                          </span>
                          {request.task_title && (
                            <span className="text-purple-400/60 text-sm">
                              • المهمة: {request.task_title}
                            </span>
                          )}
                          {hasMultipleMessages && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                              {relatedMessages.length} رسائل
                            </span>
                          )}
                        </div>
                        
                        {/* عرض المحادثة الكاملة */}
                        {isExpanded ? (
                          <div className="space-y-3 mt-4">
                            {relatedMessages.map((msg, idx) => (
                              <div key={msg.id} className="relative">
                                {/* رسالة المستخدم */}
                                <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/20">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                    <span className="text-purple-300 text-xs">المتجر</span>
                                    <span className="text-purple-400/50 text-xs">
                                      {new Date(msg.created_at).toLocaleString('ar-SA')}
                                    </span>
                                  </div>
                                  <p className="text-white text-sm">{msg.message}</p>
                                </div>
                                
                                {/* رد الأدمن */}
                                {msg.reply && (
                                  <div className="bg-green-900/20 rounded-lg p-3 mt-2 mr-6 border border-green-500/20">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-6 h-6 bg-green-500/30 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                      </div>
                                      <span className="text-green-300 text-xs">الإدارة</span>
                                      {msg.replied_at && (
                                        <span className="text-green-400/50 text-xs">
                                          {new Date(msg.replied_at).toLocaleString('ar-SA')}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-green-100 text-sm">{msg.reply}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <p className="text-white mb-2">{request.message}</p>
                            {request.reply && (
                              <div className="bg-green-900/20 rounded-lg p-3 mt-3 border border-green-500/20">
                                <div className="text-green-400 text-xs mb-1">الرد:</div>
                                <p className="text-green-100">{request.reply}</p>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-purple-400/60 text-xs">
                            {new Date(request.created_at).toLocaleString('ar-SA')}
                          </span>
                          {hasMultipleMessages && (
                            <button
                              onClick={() => setViewConversation(isExpanded ? null : request.store_id)}
                              className="text-blue-400 text-xs hover:text-blue-300 transition-colors flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                  إخفاء المحادثة
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  عرض المحادثة الكاملة ({relatedMessages.length})
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setReplyText('');
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm hover:from-green-700 hover:to-emerald-700 transition-all"
                        >
                          رد
                        </button>
                        <button
                          onClick={() => openDeleteModal(request.id)}
                          className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm transition-all"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-950/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-500/30 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-4">الرد على الاستفسار</h2>
            
            <div className="bg-purple-900/30 rounded-xl p-4 mb-4 border border-purple-500/20">
              <div className="text-purple-300 text-sm mb-1">الاستفسار:</div>
              <p className="text-white">{selectedRequest.message}</p>
            </div>

            <div className="mb-4">
              <label className="block text-white mb-2 text-sm font-medium">الرد</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب ردك هنا..."
                rows={4}
                className="w-full px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
              >
                {sending ? 'جاري الإرسال...' : 'إرسال الرد'}
              </button>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setReplyText('');
                }}
                className="flex-1 py-3 bg-purple-900/50 text-white rounded-xl font-medium hover:bg-purple-900/70 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا الطلب؟"
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

export default function HelpRequestsPage() {
  return (
    <AdminAuth>
      <HelpRequestsContent />
    </AdminAuth>
  );
}
