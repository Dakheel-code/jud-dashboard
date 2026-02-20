// components/DesignsSection.tsx
// قسم التصاميم - نافذة مدير ملفات قوقل درايف
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ===== Types =====
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

// ===== Helper Functions =====
function formatFileSize(bytes?: string): string {
  if (!bytes) return '—';
  const size = parseInt(bytes);
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getFileIcon(mimeType: string): { icon: string; color: string } {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return { icon: '📁', color: '#F4B400' };
  }

  // Images
  if (mimeType.startsWith('image/')) {
    return { icon: '🖼️', color: '#E91E63' };
  }

  // PDF
  if (mimeType === 'application/pdf') {
    return { icon: '📄', color: '#F44336' };
  }

  // Word documents
  if (
    mimeType.includes('word') ||
    mimeType === 'application/vnd.google-apps.document'
  ) {
    return { icon: '📝', color: '#4285F4' };
  }

  // Spreadsheets
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'application/vnd.google-apps.spreadsheet'
  ) {
    return { icon: '📊', color: '#0F9D58' };
  }

  // Presentations
  if (
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint') ||
    mimeType === 'application/vnd.google-apps.presentation'
  ) {
    return { icon: '📽️', color: '#F4B400' };
  }

  // Videos
  if (mimeType.startsWith('video/')) {
    return { icon: '🎬', color: '#DB4437' };
  }

  // Audio
  if (mimeType.startsWith('audio/')) {
    return { icon: '🎵', color: '#9C27B0' };
  }

  // Archives
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('tar') ||
    mimeType.includes('compressed')
  ) {
    return { icon: '📦', color: '#795548' };
  }

  // Code files
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('json') ||
    mimeType.includes('html') ||
    mimeType.includes('css') ||
    mimeType.includes('xml')
  ) {
    return { icon: '💻', color: '#607D8B' };
  }

  // Adobe files
  if (
    mimeType.includes('photoshop') ||
    mimeType.includes('illustrator') ||
    mimeType.includes('indesign')
  ) {
    return { icon: '🎨', color: '#FF5722' };
  }

  // Text
  if (mimeType.startsWith('text/')) {
    return { icon: '📃', color: '#9E9E9E' };
  }

  return { icon: '📎', color: '#9E9E9E' };
}

// ===== Component Props =====
interface DesignsSectionProps {
  storeId: string;
}

// ===== Main Component =====
export default function DesignsSection({ storeId }: DesignsSectionProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>('التصاميم');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: DriveFile | DriveFolder;
    type: 'file' | 'folder';
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    id: string;
    currentName: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch files from the API
  const fetchFiles = useCallback(
    async (folderId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ store_id: storeId });
        if (folderId) {
          params.append('folder_id', folderId);
        }

        const response = await fetch(`/api/drive?${params.toString()}`);
        if (!response.ok) {
          throw new Error('فشل في جلب الملفات');
        }

        const data = await response.json();
        setFiles(data.files || []);
        setFolders(data.folders || []);
        setBreadcrumb(data.breadcrumb || []);
        setCurrentFolderName(data.currentFolder?.name || 'التصاميم');
      } catch (err: any) {
        setError(err.message || 'حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId, fetchFiles]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Navigate to folder
  const navigateToFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
  };

  // Navigate via breadcrumb
  const navigateBreadcrumb = (item: BreadcrumbItem, index: number) => {
    if (index === breadcrumb.length - 1) return; // Already here
    setCurrentFolderId(item.id);
    setSearchQuery('');
  };

  // Go to root
  const goToRoot = () => {
    setCurrentFolderId(null);
    setSearchQuery('');
  };

  // Upload files
  const handleFileUpload = async (fileList: FileList) => {
    if (fileList.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const totalFiles = fileList.length;
    let uploadedCount = 0;

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('store_id', storeId);
        if (currentFolderId) {
          formData.append('folder_id', currentFolderId);
        }

        const response = await fetch('/api/drive', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `فشل رفع الملف: ${file.name}`);
        }

        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      // Refresh file list
      await fetchFiles(currentFolderId);
    } catch (err: any) {
      setError(err.message || 'فشل في رفع الملفات');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          folder_id: currentFolderId,
          folder_name: newFolderName.trim(),
          action: 'create_folder',
        }),
      });

      if (!response.ok) {
        throw new Error('فشل إنشاء المجلد');
      }

      setShowNewFolderDialog(false);
      setNewFolderName('');
      await fetchFiles(currentFolderId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete file/folder
  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/drive?file_id=${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('فشل حذف الملف');
      }

      setDeleteConfirm(null);
      await fetchFiles(currentFolderId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Rename file/folder
  const handleRename = async () => {
    if (!renameDialog || !renameValue.trim()) return;

    try {
      const response = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          file_id: renameDialog.id,
          new_name: renameValue.trim(),
          action: 'rename',
        }),
      });

      if (!response.ok) {
        throw new Error('فشل تغيير الاسم');
      }

      setRenameDialog(null);
      setRenameValue('');
      await fetchFiles(currentFolderId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Context menu handler
  const handleContextMenu = (
    e: React.MouseEvent,
    item: DriveFile | DriveFolder,
    type: 'file' | 'folder'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  // Filter files/folders by search
  const filteredFolders = searchQuery
    ? folders.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folders;

  const filteredFiles = searchQuery
    ? files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  const isEmpty = filteredFolders.length === 0 && filteredFiles.length === 0;

  return (
    <div className="mt-8" dir="rtl">
      {/* Section Header */}
      <div className="bg-[#1a0a2e] rounded-2xl border border-purple-500/20 overflow-hidden">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/40 border border-purple-500/30 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">التصاميم</h2>
                <p className="text-xs text-purple-400">
                  إدارة ملفات التصاميم عبر Google Drive
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-44 pl-3 pr-9 py-2 text-sm border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-purple-900/30 text-purple-200 placeholder-purple-500 transition-all"
                />
                <svg
                  className="w-4 h-4 text-purple-500 absolute right-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* View mode toggle */}
              <div className="flex bg-purple-900/40 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-purple-600/50 text-purple-200 shadow-sm'
                      : 'text-purple-500 hover:text-purple-300'
                  }`}
                  title="عرض شبكي"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-purple-600/50 text-purple-200 shadow-sm'
                      : 'text-purple-500 hover:text-purple-300'
                  }`}
                  title="عرض قائمة"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {/* New folder button */}
              <button
                onClick={() => setShowNewFolderDialog(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-300 bg-purple-900/40 border border-purple-500/30 rounded-lg hover:bg-purple-800/40 hover:border-purple-400/50 transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                مجلد جديد
              </button>

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-all shadow-sm shadow-purple-500/20 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        className="opacity-75"
                      />
                    </svg>
                    {uploadProgress}%
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    رفع ملف
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="px-6 py-2.5 border-b border-purple-500/10 bg-purple-500/5">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={goToRoot}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-200 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              التصاميم
            </button>

            {breadcrumb.slice(1).map((item, index) => (
              <span key={item.id} className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-gray-300 rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <button
                  onClick={() => navigateBreadcrumb(item, index + 1)}
                  className={`hover:text-purple-200 transition-colors ${
                    index === breadcrumb.length - 2
                      ? 'text-white font-medium'
                      : 'text-purple-400'
                  }`}
                >
                  {item.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-900/20 border border-red-500/30 rounded-xl text-sm text-red-400 flex items-center gap-2">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
            <button
              onClick={() => setError(null)}
              className="mr-auto text-red-500 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mx-6 mt-4">
            <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-purple-400 mt-1 text-center">
              جاري رفع الملفات... {uploadProgress}%
            </p>
          </div>
        )}

        {/* File Area */}
        <div
          ref={containerRef}
          className={`p-6 min-h-[300px] transition-all ${
            dragOver
              ? 'bg-purple-900/30 border-2 border-dashed border-purple-400 rounded-xl m-3'
              : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-purple-900 border-t-purple-500 rounded-full animate-spin" />
              <p className="mt-4 text-sm text-purple-400">جاري تحميل الملفات...</p>
            </div>
          ) : dragOver ? (
            /* Drag over state */
            <div className="flex flex-col items-center justify-center py-20">
              <svg
                className="w-16 h-16 text-blue-400 animate-bounce"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-4 text-lg font-medium text-purple-400">
                أفلت الملفات هنا للرفع
              </p>
            </div>
          ) : isEmpty && !searchQuery ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-purple-900/40 rounded-2xl flex items-center justify-center mb-4">
                <svg
                  className="w-10 h-10 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <p className="text-purple-300 font-medium">لا توجد ملفات</p>
              <p className="text-purple-500 text-sm mt-1">
                اسحب وأفلت الملفات هنا أو اضغط على &quot;رفع ملف&quot;
              </p>
            </div>
          ) : isEmpty && searchQuery ? (
            /* No search results */
            <div className="flex flex-col items-center justify-center py-20">
              <svg
                className="w-16 h-16 text-gray-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-purple-300 font-medium mt-4">لا توجد نتائج</p>
              <p className="text-purple-500 text-sm mt-1">
                لم يتم العثور على ملفات تطابق &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid view */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {/* Folders first */}
              {filteredFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="group relative bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 cursor-pointer hover:border-purple-400/50 hover:bg-purple-900/40 transition-all"
                  onDoubleClick={() => navigateToFolder(folder.id)}
                  onClick={() => navigateToFolder(folder.id)}
                  onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 flex items-center justify-center mb-2">
                      <svg
                        className="w-12 h-12 text-yellow-400 group-hover:text-yellow-500 transition-colors"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-purple-200 truncate w-full">
                      {folder.name}
                    </p>
                    <p className="text-xs text-purple-500 mt-0.5">
                      {formatDate(folder.modifiedTime)}
                    </p>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, folder, 'folder');
                      }}
                      className="p-1 rounded-md hover:bg-purple-700/40 text-purple-500 hover:text-purple-300"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Files */}
              {filteredFiles.map((file) => {
                const { icon, color } = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="group relative bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 cursor-pointer hover:border-purple-400/50 hover:bg-purple-900/40 transition-all"
                    onClick={() => {
                      if (file.webViewLink) {
                        window.open(file.webViewLink, '_blank');
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                  >
                    <div className="flex flex-col items-center text-center">
                      {/* Thumbnail or icon */}
                      <div className="w-14 h-14 flex items-center justify-center mb-2 rounded-lg bg-purple-900/40">
                        {file.thumbnailLink ? (
                          <img
                            src={file.thumbnailLink}
                            alt={file.name}
                            className="w-12 h-12 object-cover rounded-md"
                          />
                        ) : (
                          <span className="text-3xl">{icon}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-purple-200 truncate w-full">
                        {file.name}
                      </p>
                      <p className="text-xs text-purple-500 mt-0.5">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    {/* Hover actions */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, file, 'file');
                        }}
                        className="p-1 rounded-md hover:bg-purple-700/40 text-purple-500 hover:text-purple-300"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List view */
            <div className="overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2.5 text-xs font-medium text-purple-500 uppercase tracking-wider border-b border-purple-500/20">
                <div className="col-span-6">الاسم</div>
                <div className="col-span-2">الحجم</div>
                <div className="col-span-2">تاريخ التعديل</div>
                <div className="col-span-2">النوع</div>
              </div>

              {/* Folders */}
              {filteredFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-purple-900/30 cursor-pointer rounded-lg transition-colors group"
                  onClick={() => navigateToFolder(folder.id)}
                  onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                >
                  <div className="col-span-6 flex items-center gap-3">
                    <svg
                      className="w-6 h-6 text-yellow-400 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                    <span className="text-sm font-medium text-purple-200 truncate">
                      {folder.name}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-purple-500">—</div>
                  <div className="col-span-2 text-sm text-purple-500">
                    {formatDate(folder.modifiedTime)}
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-sm text-purple-500">مجلد</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, folder, 'folder');
                      }}
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-purple-700/40 text-purple-500 hover:text-purple-300 transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Files */}
              {filteredFiles.map((file) => {
                const { icon } = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-purple-900/30 cursor-pointer rounded-lg transition-colors group"
                    onClick={() => {
                      if (file.webViewLink) {
                        window.open(file.webViewLink, '_blank');
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <span className="text-xl shrink-0">{icon}</span>
                      <span className="text-sm text-purple-200 truncate">
                        {file.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-purple-500">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="col-span-2 text-sm text-purple-500">
                      {formatDate(file.modifiedTime)}
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="text-sm text-purple-500 truncate">
                        {file.mimeType.split('/').pop()?.substring(0, 10)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, file, 'file');
                        }}
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-purple-700/40 text-purple-500 hover:text-purple-300 transition-all"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - file count */}
        {!loading && (
          <div className="px-6 py-3 border-t border-purple-500/10 bg-purple-500/5 flex items-center justify-between">
            <span className="text-xs text-purple-500">
              {folders.length} مجلد · {files.length} ملف
            </span>
            <span className="text-xs text-purple-500 flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
              متصل بـ Google Drive
            </span>
          </div>
        )}
      </div>

      {/* ===== Context Menu ===== */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#1a0a2e] rounded-xl shadow-xl border border-purple-500/30 py-1.5 min-w-[180px]"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Open */}
          <button
            className="w-full px-4 py-2 text-sm text-purple-200 hover:bg-purple-800/50 flex items-center gap-2.5 text-right"
            onClick={() => {
              if (contextMenu.type === 'folder') {
                navigateToFolder(contextMenu.item.id);
              } else {
                const file = contextMenu.item as DriveFile;
                if (file.webViewLink) {
                  window.open(file.webViewLink, '_blank');
                }
              }
              setContextMenu(null);
            }}
          >
            <svg
              className="w-4 h-4 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            فتح
          </button>

          {/* Rename */}
          <button
            className="w-full px-4 py-2 text-sm text-purple-200 hover:bg-purple-800/50 flex items-center gap-2.5 text-right"
            onClick={() => {
              setRenameDialog({
                id: contextMenu.item.id,
                currentName: contextMenu.item.name,
              });
              setRenameValue(contextMenu.item.name);
              setContextMenu(null);
            }}
          >
            <svg
              className="w-4 h-4 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            إعادة تسمية
          </button>

          {/* Download (files only) */}
          {contextMenu.type === 'file' &&
            (contextMenu.item as DriveFile).webContentLink && (
              <button
                className="w-full px-4 py-2 text-sm text-purple-200 hover:bg-purple-800/50 flex items-center gap-2.5 text-right"
                onClick={() => {
                  const file = contextMenu.item as DriveFile;
                  if (file.webContentLink) {
                    window.open(file.webContentLink, '_blank');
                  }
                  setContextMenu(null);
                }}
              >
                <svg
                  className="w-4 h-4 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                تحميل
              </button>
            )}

          <div className="my-1 border-t border-purple-500/20" />

          {/* Delete */}
          <button
            className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 flex items-center gap-2.5 text-right"
            onClick={() => {
              setDeleteConfirm({
                id: contextMenu.item.id,
                name: contextMenu.item.name,
              });
              setContextMenu(null);
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            حذف
          </button>
        </div>
      )}

      {/* ===== New Folder Dialog ===== */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-purple-500/20">
              <h3 className="text-lg font-bold text-white">مجلد جديد</h3>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-purple-300 mb-2">
                اسم المجلد
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="أدخل اسم المجلد..."
                className="w-full px-4 py-3 text-sm border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-purple-900/30 text-purple-200 placeholder-purple-600 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setShowNewFolderDialog(false);
                }}
              />
            </div>
            <div className="px-6 py-4 border-t border-purple-500/20 flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-sm font-medium text-purple-400 hover:text-purple-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Rename Dialog ===== */}
      {renameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-purple-500/20">
              <h3 className="text-lg font-bold text-white">إعادة تسمية</h3>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-purple-300 mb-2">
                الاسم الجديد
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-purple-900/30 text-purple-200 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setRenameDialog(null);
                }}
              />
            </div>
            <div className="px-6 py-4 border-t border-purple-500/20 flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setRenameDialog(null);
                  setRenameValue('');
                }}
                className="px-4 py-2 text-sm font-medium text-purple-400 hover:text-purple-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleRename}
                disabled={!renameValue.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-purple-500/20">
              <h3 className="text-lg font-bold text-white">تأكيد الحذف</h3>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-purple-200">
                    هل أنت متأكد من حذف{' '}
                    <span className="font-bold text-white">&quot;{deleteConfirm.name}&quot;</span>؟
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    سيتم حذف هذا العنصر نهائياً من Google Drive ولا يمكن استعادته.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-purple-500/20 flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-purple-400 hover:text-purple-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-5 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all shadow-sm"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
