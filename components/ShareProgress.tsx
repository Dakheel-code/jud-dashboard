'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ShareProgressProps {
  storeName: string;
  percentage: number;
  completedTasks: number;
  totalTasks: number;
  rank?: number;
  totalStores?: number;
}

export default function ShareProgress({
  storeName,
  percentage,
  completedTasks,
  totalTasks,
  rank,
  totalStores,
}: ShareProgressProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shareText = `انا مُشارك في #معسكر_الخير\n\n🎯 ${storeName} أكملت ${percentage}% من المهام!\n\n✅ ${completedTasks} من ${totalTasks} مهمة مكتملة${rank ? `\n🏆 الترتيب: #${rank}` : ''}\n\nجاهزييين بقوه للموسم 🌙\n\n#معسكر_الخيرX10 #زد`;

  const handleShare = async (platform: string) => {
    const encodedText = encodeURIComponent(shareText);

    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedText}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?text=${encodedText}`;
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(shareText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
        return;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white rounded-xl transition-all shadow-lg hover:shadow-purple-500/50 text-sm font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        شارك إنجازك
      </button>

      {showModal && mounted && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            style={{ zIndex: 99998 }}
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-purple-950 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl animate-scale-in" style={{ zIndex: 99999 }}>
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 left-4 text-purple-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-white mb-4 text-center">شارك إنجازك 🎉</h3>

            {/* Preview */}
            <div className="bg-purple-900/50 rounded-2xl p-4 mb-6 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🏆</span>
                </div>
                <div>
                  <p className="text-white font-bold">{storeName}</p>
                  <p className="text-purple-300 text-sm">أكمل {percentage}% من المهام</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-300">
                <span>✅ {completedTasks}/{totalTasks} مهمة</span>
                {rank && <span>• 🏆 #{rank}</span>}
              </div>
            </div>

            {/* Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleShare('twitter')}
                className="flex items-center justify-center p-3 bg-black hover:bg-gray-900 text-white rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              <button
                onClick={() => handleShare('whatsapp')}
                className="flex items-center justify-center gap-2 p-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                واتساب
              </button>

              <button
                onClick={() => handleShare('telegram')}
                className="flex items-center justify-center gap-2 p-3 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                تليجرام
              </button>

              <button
                onClick={() => handleShare('copy')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-colors ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    نسخ النص
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
