'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip',
  'video/mp4', 'video/webm'
];

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_path?: string;
  mime_type?: string;
  file_size: number;
  created_at: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
}

interface TaskAttachmentsProps {
  taskId: string;
  currentUserId: string;
  userRole: string;
}

export default function TaskAttachments({ taskId, currentUserId, userRole }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = ['super_admin', 'admin'].includes(userRole);
  const isManager = ['super_admin', 'admin', 'team_leader', 'manager'].includes(userRole);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttachments();
  }, [taskId]);

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      const data = await response.json();
      if (response.ok) {
        setAttachments(data.attachments || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // التحقق من صلاحية الملف
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'حجم الملف يجب أن يكون أقل من 25 ميجابايت';
    }
    if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(file.type)) {
      return 'نوع الملف غير مدعوم';
    }
    return null;
  };

  // رفع الملف
  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            file_name: file.name,
            file_data: base64,
            mime_type: file.type,
            file_size: file.size
          })
        });

        if (response.ok) {
          const data = await response.json();
          setAttachments([data.attachment, ...attachments]);
        } else {
          const errData = await response.json();
          setError(errData.error || 'فشل رفع الملف');
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setError('فشل قراءة الملف');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('حدث خطأ أثناء رفع الملف');
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    // إعادة تعيين الـ input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  }, [taskId, attachments]);

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments?attachment_id=${attachmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAttachments(attachments.filter(a => a.id !== attachmentId));
      }
    } catch (error) {
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeFromMime = (mimeType?: string): string => {
    if (!mimeType) return 'other';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return 'document';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    return 'other';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return (
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'document':
        return (
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-purple-900/30 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="bg-purple-950/40 rounded-xl border border-purple-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20 bg-purple-900/30 flex items-center justify-between">
        <h3 className="text-white font-medium flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          المرفقات ({attachments.length})
        </h3>

        {/* Upload Button */}
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <span className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
            uploading 
              ? 'bg-purple-900/50 text-purple-400 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}>
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري الرفع...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إضافة مرفق
              </>
            )}
          </span>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="mr-auto text-red-300 hover:text-red-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Drag & Drop Zone - Clickable */}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mx-4 mt-4 p-6 border-2 border-dashed rounded-xl text-center transition-colors cursor-pointer block ${
          isDragging
            ? 'border-purple-400 bg-purple-500/10'
            : 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <svg className="w-10 h-10 mx-auto text-purple-400/60 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-purple-400/80 text-sm">
          {uploading ? 'جاري الرفع...' : isDragging ? 'أفلت الملف هنا' : 'اسحب وأفلت الملف هنا أو اضغط للاختيار'}
        </p>
        <p className="text-purple-400/50 text-xs mt-1">الحد الأقصى: 25 ميجابايت</p>
      </label>

      {/* Attachments List */}
      <div className="p-4">
        {attachments.length === 0 ? (
          <p className="text-purple-400/60 text-center py-4">لا توجد مرفقات بعد</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-purple-900/30 rounded-xl border border-purple-500/20 group"
              >
                {/* File Icon or Preview */}
                <div className="flex-shrink-0">
                  {getFileTypeFromMime(attachment.mime_type) === 'image' && attachment.file_url ? (
                    <img
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-purple-900/50 flex items-center justify-center">
                      {getFileIcon(getFileTypeFromMime(attachment.mime_type))}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{attachment.file_name}</p>
                  <p className="text-purple-400/60 text-xs">
                    {formatFileSize(attachment.file_size)} • {attachment.user?.name}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={attachment.file_url}
                    download={attachment.file_name}
                    className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-900/50 rounded-lg transition-colors"
                    title="تحميل"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  {(attachment.user?.id === currentUserId || isAdmin || isManager) && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
