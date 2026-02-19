'use client';
import { useRef, useState } from 'react';

interface Props {
  onUpload: (file: File) => void;
  onSheetImport: (url: string) => void;
  uploading: boolean;
}

export default function UploadStep({ onUpload, onSheetImport, uploading }: Props) {
  const [dragging, setDragging] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) onUpload(f);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all
          ${dragging ? 'border-purple-400 bg-purple-500/10' : 'border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5'}`}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <svg className="w-12 h-12 animate-spin text-purple-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-purple-300 font-medium">جاري رفع وتحليل الملف...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg mb-1">اسحب الملف هنا أو انقر للاختيار</p>
            <p className="text-gray-400 text-sm">يدعم: .xlsx, .xls, .csv</p>
            {dragging && (
              <div className="absolute inset-0 rounded-2xl bg-purple-500/5 border-2 border-purple-400 flex items-center justify-center">
                <p className="text-purple-300 font-bold text-xl">أفلت الملف هنا</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-500 text-sm">أو</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Google Sheet */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM9 17.25H6.75V15H9v2.25zm0-3.75H6.75v-2.25H9V13.5zm0-3.75H6.75V7.5H9v2.25zm4.5 7.5h-2.25V15h2.25v2.25zm0-3.75h-2.25v-2.25h2.25V13.5zm0-3.75h-2.25V7.5h2.25v2.25zm4.5 7.5H15.75V15H18v2.25zm0-3.75H15.75v-2.25H18V13.5zm0-3.75H15.75V7.5H18v2.25z" />
          </svg>
          <span className="text-white font-medium">استيراد من Google Sheet</span>
        </div>
        <div className="flex gap-3">
          <input
            type="url" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
            dir="ltr"
          />
          <button onClick={() => onSheetImport(sheetUrl)} disabled={!sheetUrl.trim() || uploading}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all text-sm">
            جلب
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2">تأكد أن الشيت مشارك للعموم (Anyone with link can view)</p>
      </div>
    </div>
  );
}
