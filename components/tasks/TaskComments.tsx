'use client';

import { useState, useEffect, useRef } from 'react';

interface Comment {
  id: string;
  content: string;
  is_edited: boolean;
  is_system?: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  } | null;
}

interface User {
  id: string;
  name: string;
  username: string;
}

interface TaskCommentsProps {
  taskId: string;
  currentUserId: string;
  userRole: string;
}

export default function TaskComments({ taskId, currentUserId, userRole }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  // Mention state
  const [users, setUsers] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = ['super_admin', 'admin'].includes(userRole);

  useEffect(() => {
    fetchComments();
    fetchUsers();
  }, [taskId]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?active=true');
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await response.json();
      if (response.ok) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.comment]);
        setNewComment('');
      } else {
        const error = await response.json();
        alert(error.error || 'فشل إضافة التعليق');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle mention input
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // Check for @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(' ')) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
  };

  // Insert mention
  const insertMention = (user: User) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newComment.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = newComment.substring(cursorPos);
    
    const newText = textBeforeCursor.substring(0, lastAtIndex) + `@${user.username} ` + textAfterCursor;
    setNewComment(newText);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  // Filter users for mention
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(mentionFilter) || 
    u.username.toLowerCase().includes(mentionFilter)
  ).slice(0, 5);

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setComments(comments.map(c => c.id === commentId ? data.comment : c));
        setEditingId(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTime = (date: string) => {
    try {
      const now = new Date();
      const past = new Date(date);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays < 7) return `منذ ${diffDays} يوم`;
      return past.toLocaleDateString('ar-SA');
    } catch {
      return date;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-purple-900/30 rounded-xl"></div>
        <div className="h-16 bg-purple-900/30 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="bg-purple-950/40 rounded-xl border border-purple-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20 bg-purple-900/30">
        <h3 className="text-white font-medium flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          التعليقات ({comments.length})
        </h3>
      </div>

      {/* Comments List */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-purple-400/60 text-center py-4">لا توجد تعليقات بعد</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className={`flex gap-3 ${comment.is_system ? 'opacity-80' : ''}`}>
              {/* Avatar */}
              {comment.is_system ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {comment.user?.name?.charAt(0) || '?'}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium text-sm ${comment.is_system ? 'text-cyan-400' : 'text-white'}`}>
                    {comment.is_system ? 'النظام' : comment.user?.name}
                  </span>
                  <span className="text-purple-400/60 text-xs">{formatTime(comment.created_at)}</span>
                  {comment.is_edited && (
                    <span className="text-purple-400/40 text-xs">(معدل)</span>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 bg-purple-900/50 border border-purple-500/30 rounded-lg text-white text-sm resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(comment.id)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditContent(''); }}
                        className="px-3 py-1 bg-purple-900/50 hover:bg-purple-900 text-purple-300 text-xs rounded-lg transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={`text-sm whitespace-pre-wrap break-words ${comment.is_system ? 'text-cyan-300/80 italic' : 'text-purple-200'}`}>
                      {comment.content}
                    </p>
                    
                    {/* Actions - لا تظهر لتعليقات النظام */}
                    {!comment.is_system && (comment.user?.id === currentUserId || isAdmin) && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                          className="text-purple-400 hover:text-purple-300 text-xs"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-purple-500/20 bg-purple-900/20">
        <div className="flex gap-3 relative">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleCommentChange}
              placeholder="اكتب تعليقاً... استخدم @ لذكر شخص"
              className="w-full p-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white text-sm resize-none focus:ring-2 focus:ring-purple-500 outline-none placeholder-purple-400/50"
              rows={2}
            />
            
            {/* Mention Dropdown */}
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a0a2e] border border-purple-500/30 rounded-xl shadow-xl overflow-hidden z-10">
                {filteredUsers.map((user, index) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => insertMention(user)}
                    className={`w-full px-3 py-2 text-right flex items-center gap-2 hover:bg-purple-500/20 transition-colors ${index === mentionIndex ? 'bg-purple-500/20' : ''}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-white text-sm">{user.name}</span>
                    <span className="text-purple-400/60 text-xs">@{user.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white rounded-xl transition-colors self-end"
          >
            {submitting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-purple-400/50 text-xs mt-2">استخدم @ لذكر شخص في التعليق</p>
      </form>
    </div>
  );
}
