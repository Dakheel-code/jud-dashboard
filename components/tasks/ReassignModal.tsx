'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar?: string;
}

interface ReassignModalProps {
  taskId: string;
  taskTitle: string;
  currentAssigneeId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAssignee: User) => void;
}

export default function ReassignModal({
  taskId,
  taskTitle,
  currentAssigneeId,
  isOpen,
  onClose,
  onSuccess
}: ReassignModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUserId('');
      setReason('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?active=true');
      const data = await response.json();
      if (response.ok) {
        // استبعاد المستخدم الحالي المسند له المهمة
        const filteredUsers = (data.users || []).filter(
          (u: User) => u.id !== currentAssigneeId
        );
        setUsers(filteredUsers);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setShowConfirm(true);
  };

  const confirmReassign = async () => {
    if (!selectedUserId || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_assignee_id: selectedUserId,
          reason: reason.trim() || null
        })
      });

      if (response.ok) {
        const newAssignee = users.find(u => u.id === selectedUserId);
        if (newAssignee) {
          onSuccess(newAssignee);
        }
        setShowConfirm(false);
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'فشل تحويل المهمة');
      }
    } catch (error) {
      alert('حدث خطأ أثناء تحويل المهمة');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-red-500/20 text-red-400',
      admin: 'bg-orange-500/20 text-orange-400',
      team_leader: 'bg-blue-500/20 text-blue-400',
      manager: 'bg-green-500/20 text-green-400',
      account_manager: 'bg-purple-500/20 text-purple-400',
      member: 'bg-gray-500/20 text-gray-400'
    };
    const labels: Record<string, string> = {
      super_admin: 'سوبر أدمن',
      admin: 'أدمن',
      team_leader: 'قائد فريق',
      manager: 'مدير',
      account_manager: 'مدير حساب',
      member: 'عضو'
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${styles[role] || styles.member}`}>
        {labels[role] || role}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-950 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            إعادة إسناد المهمة
          </h2>
          <p className="text-purple-400/60 text-sm mt-1 truncate">{taskTitle}</p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن مستخدم..."
              className="w-full pr-10 pl-4 py-2 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none placeholder-purple-400/50"
            />
          </div>

          {/* Users List */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-14 bg-purple-900/30 rounded-xl"></div>
                <div className="h-14 bg-purple-900/30 rounded-xl"></div>
                <div className="h-14 bg-purple-900/30 rounded-xl"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-purple-400/60 text-center py-4">لا يوجد مستخدمون</p>
            ) : (
              filteredUsers.map(user => (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedUserId === user.id
                      ? 'bg-purple-600/30 border border-purple-500'
                      : 'bg-purple-900/30 border border-purple-500/20 hover:bg-purple-900/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="assignee"
                    value={user.id}
                    checked={selectedUserId === user.id}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.name}</p>
                    <p className="text-purple-400/60 text-xs">@{user.username}</p>
                  </div>
                  {getRoleBadge(user.role)}
                </label>
              ))
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-purple-300 text-sm mb-1">سبب إعادة الإسناد (اختياري)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب إعادة الإسناد..."
              className="w-full p-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white text-sm resize-none focus:ring-2 focus:ring-purple-500 outline-none placeholder-purple-400/50"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!selectedUserId || submitting}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
            >
              تحويل المهمة
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-purple-900/50 hover:bg-purple-900 text-purple-300 rounded-xl transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-950 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-sm p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-bold mb-2">تأكيد تحويل المهمة</h3>
              <p className="text-purple-300/80 text-sm">
                هل أنت متأكد من تحويل المهمة إلى <span className="text-white font-medium">{selectedUser.name}</span>؟
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmReassign}
                disabled={submitting}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900/50 text-white rounded-xl transition-colors font-medium"
              >
                {submitting ? 'جاري التحويل...' : 'نعم، تحويل'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-2.5 bg-purple-900/50 hover:bg-purple-900 text-purple-300 rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
