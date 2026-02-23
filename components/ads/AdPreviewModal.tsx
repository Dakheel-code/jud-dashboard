'use client';

import { Ad } from './types';

export default function AdPreviewModal({ ad, onClose }: { ad: Ad; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm">
        <button
          onClick={onClose}
          className="absolute -top-10 left-0 text-white/70 hover:text-white flex items-center gap-2 text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          إغلاق
        </button>
        <div className="bg-black rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl">
          {ad.media_type === 'VIDEO' && ad.media_url ? (
            <video
              src={ad.media_url}
              controls
              autoPlay
              className="w-full aspect-[9/16] object-contain bg-black"
            />
          ) : (ad.thumbnail_url || ad.media_url) ? (
            <img
              src={ad.thumbnail_url || ad.media_url || ''}
              alt={ad.name}
              className="w-full aspect-[9/16] object-contain bg-black"
            />
          ) : (
            <div className="aspect-[9/16] flex items-center justify-center text-purple-400 bg-purple-950/50">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">لا يوجد محتوى للمعاينة</p>
              </div>
            </div>
          )}
          <div className="p-3 border-t border-purple-500/20">
            <p className="text-white text-sm font-medium truncate">{ad.name}</p>
            <p className="text-purple-400 text-xs mt-1">
              {ad.media_type === 'VIDEO' ? '🎬 فيديو' : '🖼️ صورة'} · {ad.ad_squad_name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
