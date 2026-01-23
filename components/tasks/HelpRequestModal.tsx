'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface HelpRequest {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  responded_at?: string;
  requester: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  helper: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

interface HelpRequestModalProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  userRole: string;
}

export default function HelpRequestModal({
  taskId,
  taskTitle,
  isOpen,
  onClose,
  currentUserId,
  userRole
}: HelpRequestModalProps) {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<User[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newRequest, setNewRequest] = useState({
    message: '',
    helper_id: ''
  });

  const isManagerOrAdmin = ['super_admin', 'admin', 'team_leader', 'manager'].includes(userRole);

  useEffect(() => {
    if (isOpen) {
      fetchHelpRequests();
      fetchEmployees();
    }
  }, [isOpen, taskId]);

  const fetchHelpRequests = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/help-requests`);
      const data = await response.json();
      if (response.ok) {
        setHelpRequests(data.helpRequests || []);
      }
    } catch (error) {
      console.error('Error fetching help requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/users?active=true');
      const data = await response.json();
      if (response.ok) {
        // استبعاد المستخدم الحالي
        const filtered = (data.users || []).filter((u: User) => u.id !== currentUserId);
        setEmployees(filtered);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.helper_id || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/help-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          helper_id: newRequest.helper_id,
          message: newRequest.message.trim() || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setHelpRequests([data.helpRequest, ...helpRequests]);
        setNewRequest({ message: '', helper_id: '' });
        setShowNewForm(false);
      } else {
        const err = await response.json();
        alert(err.error || 'فشل إرسال الطلب');
      }
    } catch (error) {
      console.error('Error creating help request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/help-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const data = await response.json();
        setHelpRequests(helpRequests.map(r => r.id === requestId ? data.helpRequest : r));
      }
    } catch (error) {
      console.error('Error responding to help request:', error);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      const response = await fetch(`/api/tasks/${taskId}/help-requests/${requestId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setHelpRequests(helpRequests.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Error deleting help request:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
      declined: 'bg-red-500/20 text-red-400 border-red-500/30',
      completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      accepted: 'مقبول',
      declined: 'مرفوض',
      completed: 'مكتمل'
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0620] rounded-2xl border border-purple-500/20 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-900/30">
        {/* Header */}
        <div className="p-5 border-b border-purple-500/10 flex items-center justify-between bg-gradient-to-r from-purple-900/30 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">طلبات المساعدة</h2>
              <p className="text-purple-400/60 text-xs mt-0.5 truncate max-w-[200px]">{taskTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* New Request Button */}
          {!showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full p-4 border border-dashed border-purple-500/30 rounded-xl text-purple-300 hover:text-white hover:border-purple-400/50 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-3 mb-5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-medium">طلب مساعدة جديد</span>
            </button>
          )}

          {/* New Request Form */}
          {showNewForm && (
            <form onSubmit={handleSubmit} className="bg-[#1a0a2e] rounded-xl p-5 mb-5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-white font-bold">طلب مساعدة جديد</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-purple-300 text-sm mb-2 font-medium">طلب المساعدة من</label>
                  <select
                    value={newRequest.helper_id}
                    onChange={(e) => setNewRequest({ ...newRequest, helper_id: e.target.value })}
                    className="w-full p-3 bg-transparent border border-purple-500/30 rounded-xl text-white text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 outline-none transition-all [&>option]:bg-[#1a0a2e] [&>option]:text-white"
                    required
                  >
                    <option value="">اختر شخصاً...</option>
                    {employees.map((emp: User) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-purple-300 text-sm mb-2 font-medium">رسالة (اختياري)</label>
                  <textarea
                    value={newRequest.message}
                    onChange={(e) => setNewRequest({ ...newRequest, message: e.target.value })}
                    placeholder="اشرح ما تحتاج المساعدة فيه..."
                    className="w-full p-3 bg-[#0d0620] border border-purple-500/30 rounded-xl text-white text-sm resize-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 outline-none placeholder-purple-400/40 transition-all"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !newRequest.helper_id}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:from-purple-900/50 disabled:to-purple-900/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-900/30"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        جاري الإرسال...
                      </span>
                    ) : 'إرسال الطلب'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewForm(false); setNewRequest({ message: '', helper_id: '' }); }}
                    className="px-5 py-3 bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white font-medium rounded-xl transition-all border border-purple-500/20"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Help Requests List */}
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-20 bg-purple-900/20 rounded-xl"></div>
              <div className="h-20 bg-purple-900/20 rounded-xl"></div>
            </div>
          ) : helpRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-purple-400/60 text-sm">لا توجد طلبات مساعدة</p>
              <p className="text-purple-400/40 text-xs mt-1">اضغط على الزر أعلاه لطلب مساعدة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {helpRequests.map(request => (
                <div
                  key={request.id}
                  className="bg-[#1a0a2e] rounded-xl p-4 border border-purple-500/10 hover:border-purple-500/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-900/30">
                        {request.requester?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold">{request.requester?.name}</p>
                        <p className="text-purple-400/50 text-xs">
                          {new Date(request.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Helper info */}
                  <div className="flex items-center gap-2 mb-3 bg-cyan-500/10 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-purple-300/70 text-sm">طلب مساعدة من:</span>
                    <span className="text-cyan-400 font-bold text-sm">{request.helper?.name}</span>
                  </div>

                  {request.message && (
                    <p className="text-purple-200/80 text-sm mb-3 bg-[#0d0620] p-3 rounded-lg border border-purple-500/10">{request.message}</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-purple-500/10">
                    {/* Helper can accept/decline if pending */}
                    {request.status === 'pending' && request.helper?.id === currentUserId && (
                      <>
                        <button
                          onClick={() => handleRespond(request.id, 'accepted')}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-medium rounded-lg transition-all shadow-lg shadow-green-900/20"
                        >
                          ✓ قبول
                        </button>
                        <button
                          onClick={() => handleRespond(request.id, 'declined')}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium rounded-lg transition-all border border-red-500/20"
                        >
                          ✕ رفض
                        </button>
                      </>
                    )}

                    {/* Requester can delete if pending */}
                    {request.status === 'pending' && request.requester?.id === currentUserId && (
                      <button
                        onClick={() => handleDelete(request.id)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-purple-300 text-xs font-medium rounded-lg transition-all border border-purple-500/20"
                      >
                        إلغاء الطلب
                      </button>
                    )}

                    {/* Admin/Manager can delete any */}
                    {isManagerOrAdmin && request.requester?.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(request.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium rounded-lg transition-all border border-red-500/20"
                      >
                        حذف
                      </button>
                    )}

                    {/* Show responded_at if available */}
                    {request.responded_at && (
                      <span className="text-purple-400/40 text-xs mr-auto flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        تم الرد: {new Date(request.responded_at).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
