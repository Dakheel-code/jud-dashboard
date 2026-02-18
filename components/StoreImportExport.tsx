'use client';

import { useState, useRef, useEffect } from 'react';

interface StoreImportExportProps {
  onImportSuccess: () => void;
}

interface User {
  id: string;
  name: string;
}

export default function StoreImportExport({ onImportSuccess }: StoreImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [exporting, setExporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // جلب التصنيفات والمستخدمين عند التحميل
  useEffect(() => {
    fetchCategories();
    fetchUsers();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/settings/store-categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
    }
  };

  // تحميل قالب Excel محسّن
  const downloadTemplate = async () => {
    setDownloadingTemplate(true);
    
    try {
      const XLSX = await import('xlsx');
      // إنشاء workbook جديد
      const wb = XLSX.utils.book_new();
      
      // البيانات النموذجية — أسماء الأعمدة بالإنجليزية (snake_case)
      const templateData = [
        {
          store_name: 'متجر الأمثلة',
          store_url: 'example-store.com',
          owner_name: 'أحمد محمد',
          owner_phone: '0501234567',
          owner_email: 'ahmed@example.com',
          priority: 'medium',
          status: 'new',
          budget: '5000',
          category: categories[0] || 'ملابس',
          store_group_url: 'https://chat.whatsapp.com/xxx',
          subscription_start_date: '2024-01-15',
          account_manager_id: '',
          media_buyer_id: '',
          notes: 'متجر جديد - هذا مثال'
        },
        {
          store_name: 'متجر آخر',
          store_url: 'another-store.com',
          owner_name: 'سارة علي',
          owner_phone: '0559876543',
          owner_email: 'sara@example.com',
          priority: 'high',
          status: 'active',
          budget: '10000',
          category: categories[1] || 'إلكترونيات',
          store_group_url: '',
          subscription_start_date: '2024-02-01',
          account_manager_id: '',
          media_buyer_id: '',
          notes: ''
        }
      ];

      // إنشاء ورقة البيانات الرئيسية
      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // تعيين عرض الأعمدة
      ws['!cols'] = [
        { wch: 22 }, // store_name
        { wch: 28 }, // store_url
        { wch: 22 }, // owner_name
        { wch: 15 }, // owner_phone
        { wch: 28 }, // owner_email
        { wch: 12 }, // priority
        { wch: 12 }, // status
        { wch: 12 }, // budget
        { wch: 18 }, // category
        { wch: 38 }, // store_group_url
        { wch: 20 }, // subscription_start_date
        { wch: 36 }, // account_manager_id
        { wch: 36 }, // media_buyer_id
        { wch: 35 }, // notes
      ];

      // تنسيق الهيدر
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "7C3AED" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      // إضافة الورقة الرئيسية
      XLSX.utils.book_append_sheet(wb, ws, 'المتاجر');

      // إنشاء ورقة الخيارات المتاحة
      const optionsData: any[] = [];
      
      const priorities = ['high', 'medium', 'low'];
      const statuses = ['new', 'active', 'paused', 'expired'];
      const userRows = users.map(u => ({ id: u.id, name: u.name }));
      
      const maxLen = Math.max(priorities.length, statuses.length, categories.length, userRows.length);
      
      for (let i = 0; i < maxLen; i++) {
        optionsData.push({
          'priority (القيم المتاحة)': priorities[i] || '',
          'status (القيم المتاحة)': statuses[i] || '',
          'category (التصنيفات)': categories[i] || '',
          'account_manager_id / media_buyer_id (UUID)': userRows[i]?.id || '',
          'اسم المستخدم': userRows[i]?.name || '',
        });
      }

      const wsOptions = XLSX.utils.json_to_sheet(optionsData);
      wsOptions['!cols'] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 40 },
        { wch: 25 },
      ];
      
      XLSX.utils.book_append_sheet(wb, wsOptions, 'الخيارات المتاحة');

      // إنشاء ورقة التعليمات
      const instructionsData = [
        { 'التعليمات': '📋 تعليمات استخدام قالب استيراد المتاجر' },
        { 'التعليمات': '' },
        { 'التعليمات': '✅ أسماء الأعمدة المطلوبة (بالإنجليزية):' },
        { 'التعليمات': '   store_name — اسم المتجر (مطلوب)' },
        { 'التعليمات': '   store_url — رابط المتجر بدون https:// أو www. (مطلوب)' },
        { 'التعليمات': '   owner_phone — رقم الجوال (مطلوب)' },
        { 'التعليمات': '' },
        { 'التعليمات': '📝 الأعمدة الاختيارية:' },
        { 'التعليمات': '   owner_name — اسم صاحب المتجر' },
        { 'التعليمات': '   owner_email — البريد الإلكتروني' },
        { 'التعليمات': '   priority — high / medium / low' },
        { 'التعليمات': '   status — new / active / paused / expired' },
        { 'التعليمات': '   budget — رقم فقط' },
        { 'التعليمات': '   category — راجع ورقة الخيارات المتاحة' },
        { 'التعليمات': '   store_group_url — رابط قروب المتجر' },
        { 'التعليمات': '   subscription_start_date — YYYY-MM-DD' },
        { 'التعليمات': '   account_manager_id — UUID من ورقة الخيارات' },
        { 'التعليمات': '   media_buyer_id — UUID من ورقة الخيارات' },
        { 'التعليمات': '   notes — ملاحظات' },
        { 'التعليمات': '' },
        { 'التعليمات': '⚠️ ملاحظات مهمة:' },
        { 'التعليمات': '   • إذا كان store_url موجوداً مسبقاً، سيتم تحديث بياناته' },
        { 'التعليمات': '   • احذف صفوف الأمثلة قبل الاستيراد' },
        { 'التعليمات': '   • account_manager_id و media_buyer_id هي UUID من ورقة الخيارات' },
      ];

      const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
      wsInstructions['!cols'] = [{ wch: 60 }];
      
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'التعليمات');

      // حفظ الملف
      XLSX.writeFile(wb, 'قالب_استيراد_المتاجر.xlsx');
    } catch (error) {
      alert('حدث خطأ في إنشاء القالب');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // تصدير المتاجر
  const exportStores = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/admin/stores/import-export');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل التصدير');
      }

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data.stores);
      
      // تعيين عرض الأعمدة
      ws['!cols'] = [
        { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 25 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 35 },
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المتاجر');
      
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `تصدير_المتاجر_${date}.xlsx`);
    } catch (error: any) {
      alert('خطأ في التصدير: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  // معالجة ملف الاستيراد
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress('جاري قراءة الملف...');
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على بيانات');
      }

      setImportProgress(`جاري استيراد ${jsonData.length} متجر...`);

      // إرسال البيانات للـ API
      const response = await fetch('/api/admin/stores/import-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stores: jsonData })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل الاستيراد');
      }

      setImportResult(result.results);
      
      if (result.results.success > 0) {
        onImportSuccess();
      }
    } catch (error: any) {
      setImportResult({
        success: 0,
        failed: 1,
        errors: [error.message]
      });
    } finally {
      setImporting(false);
      setImportProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      {/* شاشة التحميل أثناء الاستيراد */}
      {importing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a0a2e] border border-purple-500/40 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <svg className="w-20 h-20 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">جاري الاستيراد</h3>
            <p className="text-purple-300 text-sm">{importProgress || 'يرجى الانتظار...'}</p>
          </div>
        </div>
      )}

      {/* أزرار الاستيراد والتصدير */}
      <div className="flex gap-2">
        {/* زر تحميل القالب */}
        <button
          onClick={downloadTemplate}
          disabled={downloadingTemplate}
          className="p-2.5 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10 rounded-xl transition-all disabled:opacity-50"
          title="تحميل قالب Excel"
        >
          {downloadingTemplate ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </button>

        {/* زر الاستيراد */}
        <label className="p-2.5 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-xl transition-all cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            disabled={importing}
          />
          {importing ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
        </label>

        {/* زر التصدير */}
        <button
          onClick={exportStores}
          disabled={exporting}
          className="p-2.5 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all disabled:opacity-50"
          title="تصدير المتاجر إلى Excel"
        >
          {exporting ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
      </div>

      {/* نافذة تقرير الاستيراد */}
      {importResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${importResult.failed === 0 ? 'bg-green-500/20' : importResult.success === 0 ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                {importResult.failed === 0 ? (
                  <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : importResult.success === 0 ? (
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">تقرير الاستيراد</h3>
                <p className="text-purple-400 text-sm">إجمالي: {importResult.success + importResult.failed} صف</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-400">{importResult.success}</p>
                <p className="text-green-300 text-sm mt-1">تم بنجاح</p>
              </div>
              <div className={`border rounded-xl p-4 text-center ${importResult.failed > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-500/10 border-gray-500/20'}`}>
                <p className={`text-3xl font-bold ${importResult.failed > 0 ? 'text-red-400' : 'text-gray-500'}`}>{importResult.failed}</p>
                <p className={`text-sm mt-1 ${importResult.failed > 0 ? 'text-red-300' : 'text-gray-500'}`}>فشل</p>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="mb-4">
                <p className="text-red-400 text-sm font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  تفاصيل الأخطاء ({importResult.errors.length})
                </p>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-red-300 text-xs flex gap-2">
                      <span className="text-red-500 shrink-0">{i + 1}.</span>
                      <span>{err}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setImportResult(null)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
}
