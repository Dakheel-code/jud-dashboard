'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface StoreImportExportProps {
  onImportSuccess: () => void;
}

export default function StoreImportExport({ onImportSuccess }: StoreImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل قالب Excel
  const downloadTemplate = () => {
    const templateData = [
      {
        'اسم المتجر': 'متجر الأمثلة',
        'رابط المتجر': 'example-store.com',
        'اسم صاحب المتجر': 'أحمد محمد',
        'رقم الجوال': '0501234567',
        'البريد الإلكتروني': 'ahmed@example.com',
        'الأولوية': 'متوسط',
        'الحالة': 'جديد',
        'الميزانية': '5000',
        'التصنيف': 'ملابس',
        'رابط قروب المتجر': 'https://chat.whatsapp.com/xxx',
        'تاريخ بداية الاشتراك': '2024-01-15',
        'مدير الحساب': '',
        'الميديا باير': '',
        'ملاحظات': 'متجر جديد'
      },
      {
        'اسم المتجر': 'متجر آخر',
        'رابط المتجر': 'another-store.com',
        'اسم صاحب المتجر': 'سارة علي',
        'رقم الجوال': '0559876543',
        'البريد الإلكتروني': 'sara@example.com',
        'الأولوية': 'مرتفع',
        'الحالة': 'نشط',
        'الميزانية': '10000',
        'التصنيف': 'إلكترونيات',
        'رابط قروب المتجر': '',
        'تاريخ بداية الاشتراك': '2024-02-01',
        'مدير الحساب': '',
        'الميديا باير': '',
        'ملاحظات': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // تعيين عرض الأعمدة
    ws['!cols'] = [
      { wch: 20 }, // اسم المتجر
      { wch: 25 }, // رابط المتجر
      { wch: 20 }, // اسم صاحب المتجر
      { wch: 15 }, // رقم الجوال
      { wch: 25 }, // البريد الإلكتروني
      { wch: 12 }, // الأولوية
      { wch: 12 }, // الحالة
      { wch: 12 }, // الميزانية
      { wch: 15 }, // التصنيف
      { wch: 35 }, // رابط قروب المتجر
      { wch: 20 }, // تاريخ بداية الاشتراك
      { wch: 15 }, // مدير الحساب
      { wch: 15 }, // الميديا باير
      { wch: 30 }, // ملاحظات
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المتاجر');
    
    XLSX.writeFile(wb, 'قالب_استيراد_المتاجر.xlsx');
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
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('الملف فارغ');
      }

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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      {/* أزرار الاستيراد والتصدير */}
      <div className="flex gap-2">
        {/* زر تحميل القالب */}
        <button
          onClick={downloadTemplate}
          className="p-2.5 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10 rounded-xl transition-all"
          title="تحميل قالب Excel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
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

      {/* نافذة نتيجة الاستيراد */}
      {importResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">نتيجة الاستيراد</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-300">تم استيراد {importResult.success} متجر بنجاح</span>
              </div>

              {importResult.failed > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-300">فشل استيراد {importResult.failed} متجر</span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-400 max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="mb-1">• {err}</p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="text-red-500">... و {importResult.errors.length - 5} أخطاء أخرى</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

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
